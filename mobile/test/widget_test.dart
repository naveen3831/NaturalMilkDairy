import 'package:flutter_test/flutter_test.dart';
import 'package:natural_milk_dairy/core/constants/app_constants.dart';
import 'package:natural_milk_dairy/data/models/product_model.dart';
import 'package:natural_milk_dairy/data/models/user_model.dart';
import 'package:natural_milk_dairy/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Natural Milk Dairy App Unit & Widget Tests', () {
    testWidgets('Natural Milk Dairy smoke test - app initializes properly', (WidgetTester tester) async {
      await tester.pumpWidget(const NaturalMilkDairyApp());
      // Advance clock past splash animation timer
      await tester.pump(const Duration(seconds: 2));
      expect(find.byType(NaturalMilkDairyApp), findsOneWidget);
    });

    test('UserModel serialization and deserialization', () {
      final json = {
        'id': 'u101',
        'name': 'Rahul Sharma',
        'mobile': '9876543210',
        'email': 'rahul@example.com',
        'role': 'customer',
        'address': 'Flat 302, Green Valley',
        'area': 'Madhapur',
        'isActive': true,
      };

      final user = UserModel.fromJson(json);
      expect(user.id, 'u101');
      expect(user.name, 'Rahul Sharma');
      expect(user.mobile, '9876543210');
      expect(user.area, 'Madhapur');

      final serialized = user.toJson();
      expect(serialized['id'], 'u101');
      expect(serialized['name'], 'Rahul Sharma');
    });

    test('ProductModel catalog defaults verification', () {
      final catalog = ProductModel.defaultCatalog;
      expect(catalog.isNotEmpty, true);
      expect(catalog.length, greaterThanOrEqualTo(5));

      final first = catalog.first;
      expect(first.name, 'Farm Fresh Cow Milk 1L');
      expect(first.numericPrice, 60.0);
      expect(first.category, 'milk');
    });

    test('AppConstants defaults', () {
      expect(AppConstants.appName, 'Natural Milk Dairy');
      expect(AppConstants.morningSlotTime, '5:00 AM – 6:30 AM');
    });
  });
}
