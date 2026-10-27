class UserModel {
  final String id;
  final String name;
  final String mobile;
  final String? email;
  final String role;
  final String? address;
  final String? area;
  final bool isActive;

  UserModel({
    required this.id,
    required this.name,
    required this.mobile,
    this.email,
    this.role = 'customer',
    this.address,
    this.area,
    this.isActive = true,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      mobile: json['mobile']?.toString() ?? json['phone']?.toString() ?? '',
      email: json['email']?.toString(),
      role: json['role']?.toString() ?? 'customer',
      address: json['address']?.toString(),
      area: json['assignedArea']?.toString() ?? json['area']?.toString() ?? json['deliveryArea']?.toString(),
      isActive: json['isActive'] == null ? true : json['isActive'] == true,
    );
  }

  String get assignedArea => area ?? 'madhapur';

  String get customerId {
    if (id.isEmpty || isGuest) return 'CUST-101';
    final clean = id.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
    return clean.length > 4 ? 'CUST-${clean.substring(clean.length - 4).toUpperCase()}' : 'CUST-$clean';
  }

  factory UserModel.guest() {
    return UserModel(
      id: 'guest_user',
      name: 'Guest Explorer',
      mobile: 'Guest Mode',
      email: 'guest@naturalmilkdairy.com',
      role: 'guest',
      address: 'Doorstep Drop in Madhapur',
      area: 'Madhapur, Hyderabad',
      isActive: true,
    );
  }

  bool get isGuest => role.trim().toLowerCase() == 'guest';
  bool get isAdmin => role.trim().toLowerCase() == 'admin';
  bool get isDeliveryBoy {
    final r = role.trim().toLowerCase().replaceAll(' ', '_');
    return r == 'delivery_boy' ||
        r == 'delivery' ||
        r == 'delivery_partner' ||
        r == 'deliveryboy' ||
        r == 'driver';
  }
  bool get isCustomer {
    final r = role.trim().toLowerCase().replaceAll(' ', '_');
    return r == 'customer' ||
        r == 'user' ||
        r == 'client' ||
        (!isAdmin && !isDeliveryBoy && !isGuest);
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'mobile': mobile,
      'email': email,
      'role': role,
      'address': address,
      'area': area,
      'isActive': isActive,
    };
  }
}
