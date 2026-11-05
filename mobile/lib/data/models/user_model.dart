class UserModel {
  final String id;
  final String name;
  final String mobile;
  final String? email;
  final String role;
  final String? address;
  final String? area;
  final bool isActive;
  final bool isOnline;
  final String? lastOnlineAt;
  final String? lastOfflineAt;

  UserModel({
    required this.id,
    required this.name,
    required this.mobile,
    this.email,
    this.role = 'customer',
    this.address,
    this.area,
    this.isActive = true,
    this.isOnline = true,
    this.lastOnlineAt,
    this.lastOfflineAt,
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
      isOnline: json['isOnline'] == null ? true : json['isOnline'] == true,
      lastOnlineAt: json['lastOnlineAt']?.toString(),
      lastOfflineAt: json['lastOfflineAt']?.toString(),
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

  UserModel copyWith({
    String? id,
    String? name,
    String? mobile,
    String? email,
    String? role,
    String? address,
    String? area,
    bool? isActive,
    bool? isOnline,
    String? lastOnlineAt,
    String? lastOfflineAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      mobile: mobile ?? this.mobile,
      email: email ?? this.email,
      role: role ?? this.role,
      address: address ?? this.address,
      area: area ?? this.area,
      isActive: isActive ?? this.isActive,
      isOnline: isOnline ?? this.isOnline,
      lastOnlineAt: lastOnlineAt ?? this.lastOnlineAt,
      lastOfflineAt: lastOfflineAt ?? this.lastOfflineAt,
    );
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
      'isOnline': isOnline,
      'lastOnlineAt': lastOnlineAt,
      'lastOfflineAt': lastOfflineAt,
    };
  }
}
