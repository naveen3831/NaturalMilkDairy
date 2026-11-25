import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

class RealtimeService extends ChangeNotifier {
  static final RealtimeService _instance = RealtimeService._internal();
  factory RealtimeService() => _instance;
  RealtimeService._internal();

  WebSocket? _socket;
  Timer? _pingTimer;
  Timer? _reconnectTimer;
  bool _isConnecting = false;
  bool _isConnected = false;
  String? _connectedWsUrl;
  int _connectionGen = 0;
  String? _lastEventType;
  DateTime? _lastEventTime;

  final _eventController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get eventStream => _eventController.stream;

  bool get isConnected => _isConnected;
  bool get isConnecting => _isConnecting;
  String? get lastEventType => _lastEventType;
  DateTime? get lastEventTime => _lastEventTime;

  String _resolveWsUrl() {
    final rawBase = ApiService().baseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    if (rawBase.startsWith('https://')) {
      return '${rawBase.replaceFirst('https://', 'wss://')}/ws';
    }
    return '${rawBase.replaceFirst('http://', 'ws://')}/ws';
  }

  /// Ensures WebSocket is connected to the exact server resolved by ApiService
  void ensureSyncedWithBaseUrl() {
    if (kIsWeb) return;
    final targetWsUrl = _resolveWsUrl();
    if (_connectedWsUrl != targetWsUrl || (!_isConnected && !_isConnecting)) {
      connect();
    }
  }

  void connect() {
    if (kIsWeb) {
      debugPrint('⚡ RealtimeService: Web platform detected, skipping dart:io WebSocket');
      return;
    }

    final wsUrl = _resolveWsUrl();
    if (_isConnected || _isConnecting) {
      if (_connectedWsUrl == wsUrl) return;
      debugPrint('⚡ RealtimeService switching WS server: $_connectedWsUrl -> $wsUrl');
      _reconnectTimer?.cancel();
      _cleanup();
    }

    final targetGen = ++_connectionGen;
    _isConnecting = true;
    _connectedWsUrl = wsUrl;
    notifyListeners();

    debugPrint('⚡ RealtimeService connecting to $wsUrl');

    WebSocket.connect(wsUrl).then((ws) {
      if (targetGen != _connectionGen) {
        try {
          ws.close();
        } catch (_) {}
        return;
      }

      _socket = ws;
      _isConnected = true;
      _isConnecting = false;
      _reconnectTimer?.cancel();
      notifyListeners();
      debugPrint('⚡ RealtimeService WebSocket connected successfully');

      // Start ping heartbeat every 25 seconds
      _pingTimer?.cancel();
      _pingTimer = Timer.periodic(const Duration(seconds: 25), (_) {
        if (_socket != null && _isConnected) {
          try {
            _socket!.add(jsonEncode({'type': 'PING'}));
          } catch (_) {}
        }
      });

      ws.listen(
        (data) {
          if (targetGen != _connectionGen) return;
          try {
            final parsed = jsonDecode(data.toString()) as Map<String, dynamic>;
            final type = parsed['type']?.toString() ?? '';
            debugPrint('⚡ RealtimeService received: $type');

            if (type == 'AUTH_REQUIRED') {
              final currentToken = ApiService().token;
              if (currentToken != null && currentToken.isNotEmpty) {
                _socket?.add(jsonEncode({'type': 'AUTH', 'token': currentToken}));
              } else {
                _socket?.add(jsonEncode({'type': 'GUEST'}));
              }
            } else if (type == 'AUTHENTICATED') {
              debugPrint('⚡ RealtimeService authenticated successfully');
              _lastEventType = 'AUTHENTICATED';
              _lastEventTime = DateTime.now();
              notifyListeners();
            } else if (type != 'PONG') {
              _lastEventType = type;
              _lastEventTime = DateTime.now();
              notifyListeners();
              _eventController.add(parsed);
            }
          } catch (e) {
            debugPrint('⚡ RealtimeService message parse error: $e');
          }
        },
        onDone: () {
          if (targetGen != _connectionGen) return;
          debugPrint('⚡ RealtimeService WebSocket closed, scheduling reconnect');
          _cleanup();
          _scheduleReconnect();
        },
        onError: (err) {
          if (targetGen != _connectionGen) return;
          debugPrint('⚡ RealtimeService WebSocket error: $err');
          _cleanup();
          _scheduleReconnect();
        },
        cancelOnError: true,
      );
    }).catchError((err) {
      if (targetGen != _connectionGen) return;
      _isConnecting = false;
      _isConnected = false;
      _connectedWsUrl = null;
      notifyListeners();
      debugPrint('⚡ RealtimeService connect error: $err');
      _scheduleReconnect();
    });
  }

  void _cleanup() {
    _connectionGen++;
    _isConnected = false;
    _isConnecting = false;
    _connectedWsUrl = null;
    _pingTimer?.cancel();
    final oldSocket = _socket;
    _socket = null;
    try {
      oldSocket?.close();
    } catch (_) {}
    notifyListeners();
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {
      connect();
    });
  }

  void updateToken(String? token) {
    final targetWsUrl = _resolveWsUrl();
    if (_isConnected && _socket != null && _connectedWsUrl == targetWsUrl) {
      try {
        if (token != null && token.isNotEmpty && token != 'guest') {
          _socket!.add(jsonEncode({'type': 'AUTH', 'token': token}));
        } else {
          _socket!.add(jsonEncode({'type': 'GUEST'}));
        }
      } catch (_) {}
    } else {
      connect();
    }
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _cleanup();
  }
}
