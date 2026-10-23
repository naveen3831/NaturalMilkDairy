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
      area: json['area']?.toString() ?? json['deliveryArea']?.toString(),
      isActive: json['isActive'] == null ? true : json['isActive'] == true,
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
    };
  }
}
