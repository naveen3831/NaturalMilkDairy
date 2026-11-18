import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

class GoogleAuthResult {
  final String idToken;
  final String email;
  final String displayName;
  final String? photoUrl;

  GoogleAuthResult({
    required this.idToken,
    required this.email,
    required this.displayName,
    this.photoUrl,
  });
}

class GoogleAuthService {
  static const String serverClientId =
      '402055824353-rbjkemrlk6snih6kg8vivcejl6aauooo.apps.googleusercontent.com';

  static final FirebaseAuth _auth = FirebaseAuth.instance;
  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    serverClientId: serverClientId,
    scopes: ['email', 'profile'],
  );

  /// Trigger Google Sign-In and return Firebase ID token and profile info.
  /// Always clears cached account first so Google Play Services shows ALL accounts on the device.
  static Future<GoogleAuthResult?> signInWithGoogle() async {
    try {
      // Force account chooser by dropping cached account session
      try {
        await _googleSignIn.signOut();
      } catch (_) {}

      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) return null; // Cancelled by user

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      final OAuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final UserCredential userCredential = await _auth.signInWithCredential(credential);
      final String? idToken = await userCredential.user?.getIdToken();
      final effectiveToken = idToken ?? googleAuth.idToken;

      if (effectiveToken == null || effectiveToken.isEmpty) {
        throw Exception('Could not retrieve ID token from Google.');
      }

      return GoogleAuthResult(
        idToken: effectiveToken,
        email: googleUser.email,
        displayName: googleUser.displayName ?? '',
        photoUrl: googleUser.photoUrl,
      );
    } catch (e) {
      rethrow;
    }
  }

  static Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
      await _auth.signOut();
    } catch (_) {}
  }
}
