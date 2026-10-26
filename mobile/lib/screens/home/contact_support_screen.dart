import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_constants.dart';
import '../../../data/services/api_service.dart';
import '../../../data/services/realtime_service.dart';
import '../../../providers/auth_provider.dart';

class ContactSupportScreen extends StatefulWidget {
  final int initialTab; // 0 = Chat, 1 = Details

  const ContactSupportScreen({super.key, this.initialTab = 0});

  @override
  State<ContactSupportScreen> createState() => _ContactSupportScreenState();
}

class _ContactSupportScreenState extends State<ContactSupportScreen>
    with SingleTickerProviderStateMixin {
  final ApiService _api = ApiService();
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  int _selectedTab = 0; // 0 = Chat, 1 = Admin Details
  bool _isLoadingChats = true;
  bool _isSending = false;
  String? _currentTicketId;

  List<Map<String, dynamic>> _chatMessages = [];
  StreamSubscription? _realtimeSub;

  @override
  void initState() {
    super.initState();
    _selectedTab = widget.initialTab;
    _loadChatHistory();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _subscribeRealtime() {
    _realtimeSub = RealtimeService().eventStream.listen((event) {
      final type = event['type']?.toString();
      if (type == 'SUPPORT_CHAT_MESSAGE' || type == 'SUPPORT_TICKET_UPDATED') {
        final payload = event['payload'] as Map<String, dynamic>?;
        if (payload != null) {
          final ticket = payload['ticket'] as Map<String, dynamic>?;
          final msg = payload['message'] as Map<String, dynamic>?;

          if (ticket != null) {
            _currentTicketId ??= ticket['ticketId']?.toString();
          }

          if (msg != null && mounted) {
            final String sender = msg['sender']?.toString() ?? 'admin';
            final String text = msg['text']?.toString() ?? '';
            final String senderName = msg['senderName']?.toString() ??
                (sender == 'admin' ? 'Naveen Kumar (Admin Desk)' : 'You');
            final dynamic rawTime = msg['createdAt'] ?? DateTime.now().toIso8601String();

            // Check if already in list
            final alreadyPresent = _chatMessages.any((m) =>
                m['text'] == text &&
                m['sender'] == sender &&
                m['createdAt']?.toString() == rawTime.toString());

            if (!alreadyPresent) {
              setState(() {
                _chatMessages.add({
                  'sender': sender,
                  'senderName': senderName,
                  'text': text,
                  'createdAt': rawTime,
                });
              });
              _scrollToBottom();
            }
          } else {
            // Reload chats silently if ticket updated
            _loadChatHistory(silent: true);
          }
        }
      }
    });
  }

  Future<void> _loadChatHistory({bool silent = false}) async {
    if (!silent) setState(() => _isLoadingChats = true);

    final auth = context.read<AuthProvider>();
    final phone = auth.user?.mobile ?? '';

    try {
      final res = await _api.get('/api/supports/my-chats?phone=$phone');
      if (res['success'] == true && res['tickets'] is List) {
        final tickets = res['tickets'] as List;
        if (tickets.isNotEmpty) {
          final latestTicket = tickets.first as Map<String, dynamic>;
          _currentTicketId = latestTicket['ticketId']?.toString();

          final rawMsgs = latestTicket['messages'] as List? ?? [];
          final List<Map<String, dynamic>> parsedMsgs = [];

          for (final m in rawMsgs) {
            if (m is Map) {
              parsedMsgs.add({
                'sender': m['sender']?.toString() ?? 'customer',
                'senderName': m['senderName']?.toString() ?? 'User',
                'text': m['text']?.toString() ?? '',
                'createdAt': m['createdAt']?.toString() ?? '',
              });
            }
          }

          if (mounted) {
            setState(() {
              _chatMessages = parsedMsgs;
            });
            _scrollToBottom();
          }
        }
      }
    } catch (_) {}

    // Seed welcoming message from Admin if chat is fresh/empty
    if (_chatMessages.isEmpty && mounted) {
      setState(() {
        _chatMessages = [
          {
            'sender': 'admin',
            'senderName': 'Naveen Kumar (Admin Desk)',
            'text':
                'Namaste! Welcome to Natural Milk Dairy direct support. I am Naveen Kumar from the dispatch desk. How may I assist your morning dairy delivery today?',
            'createdAt': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
          }
        ];
      });
    }

    if (mounted && !silent) {
      setState(() => _isLoadingChats = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 80,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? quickPrompt]) async {
    final text = quickPrompt ?? _msgController.text.trim();
    if (text.isEmpty) return;

    if (quickPrompt == null) {
      _msgController.clear();
    }

    final auth = context.read<AuthProvider>();
    final user = auth.user;

    final String senderName = user?.name.isNotEmpty == true ? user!.name : 'Customer';
    final String senderPhone = user?.mobile.isNotEmpty == true ? user!.mobile : '9876543210';
    final String senderArea = user?.assignedArea ?? 'Madhapur';

    // Optimistically append customer message
    final newMsg = {
      'sender': 'customer',
      'senderName': senderName,
      'text': text,
      'createdAt': DateTime.now().toIso8601String(),
    };

    setState(() {
      _chatMessages.add(newMsg);
      _isSending = true;
    });
    _scrollToBottom();

    try {
      final res = await _api.post('/api/supports/chat', {
        'ticketId': _currentTicketId,
        'text': text,
        'senderName': senderName,
        'senderPhone': senderPhone,
        'senderArea': senderArea,
        'senderRole': 'customer',
      });

      if (res['success'] == true && res['ticket'] != null) {
        final ticket = res['ticket'] as Map<String, dynamic>;
        _currentTicketId = ticket['ticketId']?.toString();
      }
    } catch (e) {
      debugPrint('Failed sending chat message: $e');
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  void _launchCall(String phone) {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    Clipboard.setData(ClipboardData(text: clean));
    if (mounted) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.phone_in_talk_rounded, color: Color(0xFF0D5C3A)),
              SizedBox(width: 10),
              Text('Admin Helpline', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Phone number copied to clipboard:'),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5EE),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(phone, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0D5C3A))),
              ),
              const SizedBox(height: 12),
              const Text('Available 5:00 AM – 9:00 PM for morning deliveries & dispatch help.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('OK', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0D5C3A))),
            ),
          ],
        ),
      );
    }
  }

  void _launchWhatsApp(String phone) {
    Clipboard.setData(ClipboardData(text: phone));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('WhatsApp helpline $phone copied to clipboard!'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: const Color(0xFF0D5C3A),
        ),
      );
    }
  }

  void _launchEmail(String email) {
    Clipboard.setData(ClipboardData(text: email));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Support email $email copied to clipboard!'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: const Color(0xFF0D5C3A),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      appBar: _buildAppBar(),
      body: SafeArea(
        child: Column(
          children: [
            // Segmented Tab Selector (Chat vs Admin Details)
            _buildTabSelector(),

            // Body Page View
            Expanded(
              child: _selectedTab == 0 ? _buildChatView() : _buildAdminDetailsView(),
            ),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0.5,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
        onPressed: () => Navigator.pop(context),
      ),
      titleSpacing: 0,
      title: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: const Color(0xFF0D5C3A),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.support_agent_rounded, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Natural Milk Dairy Desk',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0C2340),
                  ),
                ),
                SizedBox(height: 2),
                Row(
                  children: [
                    Icon(Icons.circle, color: Color(0xFF10B981), size: 7),
                    SizedBox(width: 4),
                    Text(
                      'Admin Online • 5 AM – 9 PM',
                      style: TextStyle(fontSize: 11, color: Color(0xFF059669), fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.phone_in_talk_rounded, color: Color(0xFF0D5C3A), size: 21),
          tooltip: 'Direct Call Admin',
          onPressed: () => _launchCall(AppConstants.supportDisplayPhone),
        ),
        const SizedBox(width: 6),
      ],
    );
  }

  Widget _buildTabSelector() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Container(
        height: 44,
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () => setState(() => _selectedTab = 0),
                borderRadius: BorderRadius.circular(9),
                child: Container(
                  decoration: BoxDecoration(
                    color: _selectedTab == 0 ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(9),
                    boxShadow: _selectedTab == 0
                        ? [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ]
                        : null,
                  ),
                  child: Center(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.chat_bubble_outline_rounded,
                          size: 16,
                          color: _selectedTab == 0 ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Live Chat with Admin',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: _selectedTab == 0 ? FontWeight.w800 : FontWeight.w600,
                            color: _selectedTab == 0 ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              child: InkWell(
                onTap: () => setState(() => _selectedTab = 1),
                borderRadius: BorderRadius.circular(9),
                child: Container(
                  decoration: BoxDecoration(
                    color: _selectedTab == 1 ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(9),
                    boxShadow: _selectedTab == 1
                        ? [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ]
                        : null,
                  ),
                  child: Center(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.badge_outlined,
                          size: 16,
                          color: _selectedTab == 1 ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Admin Details',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: _selectedTab == 1 ? FontWeight.w800 : FontWeight.w600,
                            color: _selectedTab == 1 ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 1. LIVE CHAT VIEW
  Widget _buildChatView() {
    return Column(
      children: [
        // Realtime sync banner
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
          color: const Color(0xFFE8F5EE),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.bolt_rounded, size: 14, color: Color(0xFF0D5C3A)),
              SizedBox(width: 6),
              Text(
                'Live 2-Way Sync Active • Messages deliver instantly to Admin',
                style: TextStyle(color: Color(0xFF0D5C3A), fontSize: 11, fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),

        // Chat Message Stream
        Expanded(
          child: _isLoadingChats
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF0D5C3A)))
              : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  itemCount: _chatMessages.length,
                  itemBuilder: (ctx, i) {
                    final msg = _chatMessages[i];
                    final bool isAdmin = msg['sender'] == 'admin';
                    return _buildChatBubble(msg, isAdmin);
                  },
                ),
        ),

        // Quick Prompt Chips
        _buildQuickChips(),

        // Chat Input Box
        _buildChatInput(),
      ],
    );
  }

  Widget _buildChatBubble(Map<String, dynamic> msg, bool isAdmin) {
    final String text = msg['text']?.toString() ?? '';
    final String senderName = msg['senderName']?.toString() ?? (isAdmin ? 'Naveen Kumar (Admin Desk)' : 'You');
    final String timeStr = _formatMessageTime(msg['createdAt']?.toString());

    if (isAdmin) {
      // Left-aligned Admin Bubble
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: const BoxDecoration(
                color: Color(0xFF0D5C3A),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.shield_rounded, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(16),
                    bottomLeft: Radius.circular(4),
                    bottomRight: Radius.circular(16),
                  ),
                  border: Border.all(color: const Color(0xFFE2EBE5)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          senderName,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0D5C3A),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'ADMIN',
                            style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w900, color: Color(0xFF15803D)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      text,
                      style: const TextStyle(
                        fontSize: 13.5,
                        color: Color(0xFF1E293B),
                        height: 1.4,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Align(
                      alignment: Alignment.bottomRight,
                      child: Text(
                        timeStr,
                        style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    } else {
      // Right-aligned Customer Bubble
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Flexible(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: const BoxDecoration(
                  color: Color(0xFF0D5C3A),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(4),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      text,
                      style: const TextStyle(
                        fontSize: 13.5,
                        color: Colors.white,
                        height: 1.4,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      timeStr,
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.white.withValues(alpha: 0.75),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }
  }

  Widget _buildQuickChips() {
    final chips = [
      '🥛 Morning milk drop timing',
      '⏰ Need delivery at 5:15 AM',
      '🚪 Leave bottle at door handle',
      '💳 Balance & bill payment inquiry',
    ];

    return Container(
      height: 38,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: chips.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          return InkWell(
            onTap: () => _sendMessage(chips[i]),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFCBD5E1)),
              ),
              child: Center(
                child: Text(
                  chips[i],
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: Color(0xFF334155),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildChatInput() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: TextField(
                  controller: _msgController,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _sendMessage(),
                  decoration: const InputDecoration(
                    hintText: 'Type message to Admin...',
                    hintStyle: TextStyle(fontSize: 13.5, color: Color(0xFF94A3B8)),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            InkWell(
              onTap: _isSending ? null : () => _sendMessage(),
              borderRadius: BorderRadius.circular(24),
              child: Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  color: Color(0xFF0D5C3A),
                  shape: BoxShape.circle,
                ),
                child: _isSending
                    ? const Center(
                        child: SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        ),
                      )
                    : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 2. ADMIN DETAILS VIEW
  Widget _buildAdminDetailsView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Admin Profile Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF0D5C3A), Color(0xFF073822)],
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0D5C3A).withValues(alpha: 0.25),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFFF5C249), width: 2),
                      ),
                      child: const Center(
                        child: Icon(Icons.person_rounded, color: Color(0xFF0D5C3A), size: 34),
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'Naveen Kumar',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 19,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              SizedBox(width: 6),
                              Icon(Icons.verified_rounded, color: Color(0xFFF5C249), size: 18),
                            ],
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Head of Operations & System Admin',
                            style: TextStyle(
                              color: Color(0xFFD1FAE5),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            'Natural Milk Dairy Desk',
                            style: TextStyle(
                              color: Color(0xFFA7F3D0),
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                const Divider(color: Colors.white24, height: 1),
                const SizedBox(height: 14),
                const Row(
                  children: [
                    Icon(Icons.shield_outlined, color: Color(0xFFF5C249), size: 16),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Direct operational control for delivery routes, billing & quality audits.',
                        style: TextStyle(color: Colors.white, fontSize: 12, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),

          const Text(
            'Direct Admin Actions',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0C2340),
            ),
          ),
          const SizedBox(height: 12),

          // Action 1: Call Admin
          _buildActionCard(
            icon: Icons.phone_rounded,
            iconBg: const Color(0xFFDCFCE7),
            iconColor: const Color(0xFF166534),
            title: 'Call Admin Directly',
            subtitle: '+91 98765 43210 (Immediate assistance)',
            buttonLabel: 'Call Now',
            onTap: () => _launchCall('+919876543210'),
          ),

          // Action 2: WhatsApp Admin
          _buildActionCard(
            icon: Icons.chat_rounded,
            iconBg: const Color(0xFFDCFCE7),
            iconColor: const Color(0xFF15803D),
            title: 'WhatsApp Operations Desk',
            subtitle: '+91 98765 43210 (Fast WhatsApp replies)',
            buttonLabel: 'Open Chat',
            onTap: () => _launchWhatsApp('+919876543210'),
          ),

          // Action 3: Email Desk
          _buildActionCard(
            icon: Icons.mail_rounded,
            iconBg: const Color(0xFFE0F2FE),
            iconColor: const Color(0xFF0369A1),
            title: 'Email Management Desk',
            subtitle: 'care@naturalmilkdairy.com',
            buttonLabel: 'Send Email',
            onTap: () => _launchEmail('care@naturalmilkdairy.com'),
          ),

          const SizedBox(height: 22),

          // Operational Details
          const Text(
            'Operations & Dispatch Hub',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0C2340),
            ),
          ),
          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2EBE5)),
            ),
            child: const Column(
              children: [
                _DetailRow(
                  icon: Icons.schedule_rounded,
                  label: 'Helpline Hours',
                  value: '5:00 AM – 9:00 PM Daily (365 Days)',
                ),
                SizedBox(height: 14),
                _DetailRow(
                  icon: Icons.local_shipping_outlined,
                  label: 'Morning Delivery Drop',
                  value: '5:00 AM – 6:30 AM Doorstep Drop',
                ),
                SizedBox(height: 14),
                _DetailRow(
                  icon: Icons.location_on_outlined,
                  label: 'Farm & Dispatch Center',
                  value: 'Plot 14, Green Valley Agro Hub, Andheri, Mumbai 400053',
                ),
              ],
            ),
          ),

          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String subtitle,
    required String buttonLabel,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2EBE5)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0C2340),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: onTap,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0D5C3A),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              minimumSize: Size.zero,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(buttonLabel, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }

  String _formatMessageTime(String? isoString) {
    if (isoString == null || isoString.isEmpty) return 'Just now';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      final min = dt.minute.toString().padLeft(2, '0');
      return '$hour:$min $period';
    } catch (_) {
      return 'Just now';
    }
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: const Color(0xFF0D5C3A), size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0C2340),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
