import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:natural_milk_dairy/core/constants/app_colors.dart';
import 'package:natural_milk_dairy/core/constants/app_constants.dart';
import 'package:natural_milk_dairy/core/theme/app_theme.dart';
import 'package:natural_milk_dairy/data/services/api_service.dart';
import 'package:natural_milk_dairy/data/services/realtime_service.dart';
import 'package:natural_milk_dairy/providers/auth_provider.dart';
import 'package:natural_milk_dairy/providers/customer_provider.dart';
import 'package:natural_milk_dairy/providers/product_provider.dart';
import 'package:natural_milk_dairy/screens/splash/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system navigation and status bar style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: AppColors.milkWhite,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  // Initialize API service, detect connectivity, and start WebSocket
  await ApiService().init();
  RealtimeService().connect();

  runApp(const NaturalMilkDairyApp());
}

class NaturalMilkDairyApp extends StatelessWidget {
  const NaturalMilkDairyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ProductProvider()),
        ChangeNotifierProvider(create: (_) => CustomerProvider()),
        ChangeNotifierProvider.value(value: RealtimeService()),
      ],
      child: MaterialApp(
        title: AppConstants.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const SplashScreen(),
      ),
    );
  }
}
