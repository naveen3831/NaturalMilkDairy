import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_constants.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _identifierController = TextEditingController();
  bool _submitted = false;

  @override
  void dispose() {
    _identifierController.dispose();
    super.dispose();
  }

  void _handleSubmit() {
    if (_identifierController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your registered mobile number or email.')),
      );
      return;
    }

    setState(() => _submitted = true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.creamBg,
      appBar: AppBar(
        title: const Text('Password Assistance'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primaryGreenSoft,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.2), width: 1.5),
                  ),
                  child: const Center(
                    child: Icon(Icons.lock_reset_rounded, size: 44, color: AppColors.primaryGreen),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: Text(
                  'Reset Your Password',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.dairyBlue,
                      ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'Enter your registered mobile or email to recover account access',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
              ),
              const SizedBox(height: 32),

              if (!_submitted) ...[
                const Text(
                  'Registered Mobile or Email',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _identifierController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    hintText: 'e.g. 9876543210 or user@example.com',
                    prefixIcon: Icon(Icons.contact_mail_outlined, size: 20, color: AppColors.textMuted),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text('Send Reset Instructions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                ),
              ] else ...[
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.milkWhite,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.3)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.check_circle_rounded, color: AppColors.emeraldGreen, size: 48),
                      const SizedBox(height: 12),
                      const Text(
                        'Request Logged Successfully',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.dairyBlue),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'For security, a password reset verification link and OTP have been initiated for "${_identifierController.text.trim()}". You can also reach our delivery coordinator directly below.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 13, color: AppColors.textMuted, height: 1.45),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              const SizedBox(height: 16),
              // Support Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.dairyBlueSoft,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.dairyBlue.withValues(alpha: 0.15)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.support_agent_rounded, color: AppColors.dairyBlue, size: 22),
                        const SizedBox(width: 8),
                        const Text(
                          'Direct Dairy Supervisor Helpline',
                          style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.dairyBlue, fontSize: 14),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Need urgent assistance or locked out of your morning deliveries? Contact our customer care hotline anytime:',
                      style: TextStyle(fontSize: 12.5, color: AppColors.textMuted, height: 1.4),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Dialing ${AppConstants.supportDisplayPhone}...')),
                              );
                            },
                            icon: const Icon(Icons.phone_rounded, size: 16),
                            label: const Text('Call Us', style: TextStyle(fontSize: 13)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.dairyBlue,
                              padding: const EdgeInsets.symmetric(vertical: 11),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Opening WhatsApp support (+91 98765 43210)...')),
                              );
                            },
                            icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16, color: AppColors.primaryGreen),
                            label: const Text('WhatsApp', style: TextStyle(fontSize: 13, color: AppColors.primaryGreen)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.primaryGreen),
                              padding: const EdgeInsets.symmetric(vertical: 11),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),
              Center(
                child: TextButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back_rounded, size: 16, color: AppColors.primaryGreen),
                  label: const Text(
                    'Return to Sign In',
                    style: TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
