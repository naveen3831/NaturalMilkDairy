import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:natural_milk_dairy/providers/auth_provider.dart';
import 'package:natural_milk_dairy/providers/customer_provider.dart';
import 'package:natural_milk_dairy/services/launcher_service.dart';
import 'contact_support_screen.dart';
import 'select_location_map_screen.dart';

class DeliveryAddressesScreen extends StatefulWidget {
  const DeliveryAddressesScreen({super.key});

  @override
  State<DeliveryAddressesScreen> createState() => _DeliveryAddressesScreenState();
}

class _DeliveryAddressesScreenState extends State<DeliveryAddressesScreen> {
  String _dropInstruction = 'Place in doorstep dairy bag';

  final List<String> _instructionPresets = [
    'Place in doorstep dairy bag',
    'Ring doorbell once after dropping',
    'Do not ring bell before 6:30 AM',
    'Leave at apartment security desk',
    'Hand over directly to security',
    'Leave inside main gate latch',
  ];

  final List<String> _areas = [
    'Madhapur',
    'Gachibowli',
    'Hitec City',
    'Kondapur',
    'Jubilee Hills',
    'Banjara Hills',
    'Financial District',
    'Kukatpally',
    'Manikonda',
  ];

  final Map<String, List<double>> _areaCoordinates = {
    'Madhapur': [17.4483, 78.3915],
    'Hitec City': [17.4435, 78.3772],
    'Gachibowli': [17.4401, 78.3489],
    'Kondapur': [17.4699, 78.3578],
    'Jubilee Hills': [17.4319, 78.4073],
    'Banjara Hills': [17.4156, 78.4357],
    'Financial District': [17.4156, 78.3427],
    'Kukatpally': [17.4849, 78.4138],
    'Manikonda': [17.3995, 78.3752],
    'Miyapur': [17.4968, 78.3564],
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<CustomerProvider>().fetchSavedAddresses();
      }
    });
  }

  void _showMapLocationSelector(
    BuildContext context, {
    required String currentArea,
    required num? initialLat,
    required num? initialLng,
    required Function(num lat, num lng, String areaName, String? addressSnippet) onSelected,
  }) async {
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (_) => SelectLocationMapScreen(
          initialLat: initialLat?.toDouble() ?? _areaCoordinates[currentArea]?[0],
          initialLng: initialLng?.toDouble() ?? _areaCoordinates[currentArea]?[1],
          initialArea: currentArea,
        ),
      ),
    );

    if (result != null) {
      final lat = result['latitude'] as num? ?? 17.4483;
      final lng = result['longitude'] as num? ?? 78.3915;
      final area = result['area']?.toString() ?? currentArea;
      final addressSnippet = result['address']?.toString();
      onSelected(lat, lng, area, addressSnippet);
    }
  }

  void _showAddAddressSheet(BuildContext context, CustomerProvider customerProvider, AuthProvider auth) {
    final TextEditingController addressCtrl = TextEditingController();
    final TextEditingController flatCtrl = TextEditingController();
    final TextEditingController landmarkCtrl = TextEditingController();
    final TextEditingController instructionsCtrl = TextEditingController(text: _dropInstruction);
    String selectedArea = customerProvider.area.isNotEmpty ? customerProvider.area : (auth.user?.assignedArea ?? 'Madhapur');
    if (!_areas.contains(selectedArea)) {
      _areas.insert(0, selectedArea);
    }
    String selectedLabel = 'Home';
    bool makePrimary = false;
    num? selectedLat = customerProvider.latitude ?? (_areaCoordinates[selectedArea]?[0]);
    num? selectedLng = customerProvider.longitude ?? (_areaCoordinates[selectedArea]?[1]);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 44,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Add New Address',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                          onPressed: () => Navigator.pop(sheetCtx),
                        ),
                      ],
                    ),
                    const Text(
                      'Save a new drop location for your fresh morning milk deliveries.',
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 18),

                    // Address Type / Label
                    const Text(
                      'Address Label',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: ['Home', 'Work', 'Other'].map((lbl) {
                        final isSel = selectedLabel == lbl;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(lbl),
                            selected: isSel,
                            selectedColor: const Color(0xFFE2F1EA),
                            backgroundColor: const Color(0xFFF1F5F9),
                            labelStyle: TextStyle(
                              color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFF475569),
                              fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                              fontSize: 12,
                            ),
                            side: BorderSide(
                              color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFE2E8F0),
                            ),
                            onSelected: (_) => setSheetState(() => selectedLabel = lbl),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 14),

                    // Map Location Pin Selector Card
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: selectedLat != null ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: selectedLat != null ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: selectedLat != null ? const Color(0xFFE2F1EA) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              Icons.pin_drop_rounded,
                              color: selectedLat != null ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  selectedLat != null ? 'Location Pinned on Map' : 'Select Location on Map',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w800,
                                    color: selectedLat != null ? const Color(0xFF065F46) : const Color(0xFF0C2340),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  selectedLat != null
                                      ? 'Lat: ${selectedLat!.toStringAsFixed(4)}, Lng: ${selectedLng!.toStringAsFixed(4)}'
                                      : 'Tap to choose exact GPS drop coordinates',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: selectedLat != null ? const Color(0xFF166534) : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              _showMapLocationSelector(
                                context,
                                currentArea: selectedArea,
                                initialLat: selectedLat,
                                initialLng: selectedLng,
                                onSelected: (lat, lng, area, addressSnippet) {
                                  setSheetState(() {
                                    selectedLat = lat;
                                    selectedLng = lng;
                                    selectedArea = area;
                                    if (addressSnippet != null && addressSnippet.isNotEmpty && addressCtrl.text.isEmpty) {
                                      addressCtrl.text = addressSnippet;
                                    }
                                    if (!_areas.contains(area)) _areas.insert(0, area);
                                  });
                                },
                              );
                            },
                            style: TextButton.styleFrom(
                              backgroundColor: const Color(0xFF0D5C3A),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: Text(
                              selectedLat != null ? 'Change' : 'Select Pin',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Flat / House No
                    const Text(
                      'Flat / House No. / Floor (Optional)',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: flatCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Flat 402, 4th Floor',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // House / Building & Street
                    const Text(
                      'Apartment, Building & Street *',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: addressCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Lotus Towers, Road No. 12',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Route Area Dropdown
                    const Text(
                      'Service Route Area *',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedArea,
                          isExpanded: true,
                          items: _areas.map((a) {
                            return DropdownMenuItem(
                              value: a,
                              child: Text(a, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setSheetState(() => selectedArea = val);
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Landmark
                    const Text(
                      'Landmark / Directions (Optional)',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: landmarkCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Near HDFC Bank ATM, 2nd Cross',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Drop Instructions
                    const Text(
                      'Doorstep Drop Instructions',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: instructionsCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Place in milk bag at door latch',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Preset quick chips
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: _instructionPresets.map((inst) {
                        final isSel = instructionsCtrl.text == inst;
                        return InkWell(
                          onTap: () => setSheetState(() => instructionsCtrl.text = inst),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: isSel ? const Color(0xFFE2F1EA) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFE2E8F0)),
                            ),
                            child: Text(
                              inst,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),

                    // Make Primary Checkbox / Switch
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: Row(
                        children: [
                          Checkbox(
                            value: makePrimary,
                            activeColor: const Color(0xFF0D5C3A),
                            onChanged: (val) => setSheetState(() => makePrimary = val ?? false),
                          ),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Set as Primary Delivery Address',
                                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                                ),
                                Text(
                                  'Daily morning subscription milk will be dropped to this location.',
                                  style: TextStyle(fontSize: 11, color: Color(0xFF166534)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D5C3A),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        onPressed: () async {
                          final newAddr = addressCtrl.text.trim();
                          final flat = flatCtrl.text.trim();
                          final newLandmark = landmarkCtrl.text.trim();
                          final newInst = instructionsCtrl.text.trim();

                          if (newAddr.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Please enter your street address')),
                            );
                            return;
                          }

                          Navigator.pop(sheetCtx);

                          final fullAddr = flat.isNotEmpty ? '$flat, $newAddr' : newAddr;
                          final messenger = ScaffoldMessenger.of(context);

                          final ok = await customerProvider.addSavedAddress(
                            address: fullAddr,
                            flatNo: flat,
                            area: selectedArea,
                            landmark: newLandmark,
                            label: selectedLabel,
                            type: selectedLabel.toLowerCase(),
                            deliveryInstructions: newInst,
                            isDefault: makePrimary,
                            latitude: selectedLat,
                            longitude: selectedLng,
                          );

                          if (mounted) {
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(ok
                                    ? (makePrimary
                                        ? '✓ New address added and set as Primary Delivery Address!'
                                        : '✓ New delivery address added successfully!')
                                    : 'Delivery address added.'),
                                backgroundColor: const Color(0xFF0D5C3A),
                              ),
                            );
                          }
                        },
                        child: const Text(
                          'Save Delivery Address',
                          style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showEditAddressSheet(
    BuildContext context,
    CustomerProvider customerProvider,
    AuthProvider auth, {
    Map<String, dynamic>? addressItem,
  }) {
    final String initialAddress = addressItem != null
        ? (addressItem['apartmentStreet']?.toString() ?? addressItem['address']?.toString() ?? '')
        : (customerProvider.address.isNotEmpty ? customerProvider.address : (auth.user?.address ?? ''));

    final String initialLandmark = addressItem != null
        ? (addressItem['landmark']?.toString() ?? '')
        : customerProvider.landmark;

    final String initialInst = addressItem != null
        ? (addressItem['deliveryInstructions']?.toString() ?? _dropInstruction)
        : _dropInstruction;

    String selectedArea = addressItem != null
        ? (addressItem['area']?.toString() ?? 'Madhapur')
        : (customerProvider.area.isNotEmpty ? customerProvider.area : (auth.user?.assignedArea ?? 'Madhapur'));

    if (!_areas.contains(selectedArea)) {
      _areas.insert(0, selectedArea);
    }

    final TextEditingController addressCtrl = TextEditingController(text: initialAddress);
    final TextEditingController landmarkCtrl = TextEditingController(text: initialLandmark);
    final TextEditingController instructionsCtrl = TextEditingController(text: initialInst);
    num? selectedLat = addressItem?['latitude'] as num? ?? customerProvider.latitude ?? (_areaCoordinates[selectedArea]?[0]);
    num? selectedLng = addressItem?['longitude'] as num? ?? customerProvider.longitude ?? (_areaCoordinates[selectedArea]?[1]);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 44,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Edit Delivery Address',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                          onPressed: () => Navigator.pop(sheetCtx),
                        ),
                      ],
                    ),
                    const Text(
                      'Update your doorstep morning delivery location and drop notes.',
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 18),

                    // Map Location Pin Selector Card
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: selectedLat != null ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: selectedLat != null ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: selectedLat != null ? const Color(0xFFE2F1EA) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              Icons.pin_drop_rounded,
                              color: selectedLat != null ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  selectedLat != null ? 'Location Pinned on Map' : 'Select Location on Map',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w800,
                                    color: selectedLat != null ? const Color(0xFF065F46) : const Color(0xFF0C2340),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  selectedLat != null
                                      ? 'Lat: ${selectedLat!.toStringAsFixed(4)}, Lng: ${selectedLng!.toStringAsFixed(4)}'
                                      : 'Tap to choose exact GPS drop coordinates',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: selectedLat != null ? const Color(0xFF166534) : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              _showMapLocationSelector(
                                context,
                                currentArea: selectedArea,
                                initialLat: selectedLat,
                                initialLng: selectedLng,
                                onSelected: (lat, lng, area, addressSnippet) {
                                  setSheetState(() {
                                    selectedLat = lat;
                                    selectedLng = lng;
                                    selectedArea = area;
                                    if (addressSnippet != null && addressSnippet.isNotEmpty && addressCtrl.text.isEmpty) {
                                      addressCtrl.text = addressSnippet;
                                    }
                                    if (!_areas.contains(area)) _areas.insert(0, area);
                                  });
                                },
                              );
                            },
                            style: TextButton.styleFrom(
                              backgroundColor: const Color(0xFF0D5C3A),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: Text(
                              selectedLat != null ? 'Change' : 'Select Pin',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // House / Flat & Street
                    const Text(
                      'House / Flat No., Building & Street *',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: addressCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Flat 402, Lotus Towers, Road No. 12',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Route Area Dropdown
                    const Text(
                      'Service Route Area *',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedArea,
                          isExpanded: true,
                          items: _areas.map((a) {
                            return DropdownMenuItem(
                              value: a,
                              child: Text(a, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setSheetState(() => selectedArea = val);
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Landmark
                    const Text(
                      'Landmark / Directions (Optional)',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: landmarkCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Near HDFC Bank ATM, 2nd Cross',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Drop Instructions
                    const Text(
                      'Doorstep Drop Instructions',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: instructionsCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Place in milk bag at door latch',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Preset quick chips
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: _instructionPresets.map((inst) {
                        final isSel = instructionsCtrl.text == inst;
                        return InkWell(
                          onTap: () => setSheetState(() => instructionsCtrl.text = inst),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: isSel ? const Color(0xFFE2F1EA) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFE2E8F0)),
                            ),
                            child: Text(
                              inst,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 22),

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D5C3A),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        onPressed: () {
                          final newAddr = addressCtrl.text.trim();
                          final newLandmark = landmarkCtrl.text.trim();
                          final newInst = instructionsCtrl.text.trim();

                          if (newAddr.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Please enter your house and street address')),
                            );
                            return;
                          }

                          setState(() {
                            if (newInst.isNotEmpty) _dropInstruction = newInst;
                          });

                          if (addressItem != null && addressItem['id'] != null) {
                            customerProvider.updateSavedAddress(
                              addressId: addressItem['id'].toString(),
                              address: newAddr,
                              area: selectedArea,
                              landmark: newLandmark,
                              deliveryInstructions: newInst,
                              latitude: selectedLat,
                              longitude: selectedLng,
                              isDefault: addressItem['isDefault'] == true,
                            );
                          } else {
                            customerProvider.updateDeliveryAddress(
                              address: newAddr,
                              area: selectedArea,
                              landmark: newLandmark,
                              latitude: selectedLat,
                              longitude: selectedLng,
                            );
                          }

                          Navigator.pop(sheetCtx);

                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('✓ Delivery address and drop instructions updated!'),
                              backgroundColor: Color(0xFF0D5C3A),
                            ),
                          );
                        },
                        child: const Text(
                          'Save Address & Instructions',
                          style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _handleSetPrimary(String addressId, Map<String, dynamic> addr, CustomerProvider customerProvider) async {
    final messenger = ScaffoldMessenger.of(context);
    final ok = await customerProvider.setDefaultAddress(addressId);
    if (!ok) {
      // Fallback: update main customer profile delivery address directly
      await customerProvider.updateDeliveryAddress(
        address: addr['apartmentStreet']?.toString() ?? addr['address']?.toString() ?? '',
        area: addr['area']?.toString() ?? 'Madhapur',
        landmark: addr['landmark']?.toString() ?? '',
        latitude: (addr['latitude'] as num?)?.toDouble(),
        longitude: (addr['longitude'] as num?)?.toDouble(),
      );
    }
    if (mounted) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('✓ Set as your primary delivery address! Morning deliveries will be dropped here.'),
          backgroundColor: Color(0xFF0D5C3A),
          duration: Duration(seconds: 3),
        ),
      );
    }
  }

  void _handleDeleteAddress(String addressId, CustomerProvider customerProvider) async {
    final messenger = ScaffoldMessenger.of(context);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Address?'),
        content: const Text('Are you sure you want to remove this delivery address?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final ok = await customerProvider.deleteSavedAddress(addressId);
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(ok ? '✓ Address removed' : 'Address deleted'),
            backgroundColor: const Color(0xFF0D5C3A),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final customerProvider = context.watch<CustomerProvider>();
    final user = auth.user;

    final String primaryAddressStr = customerProvider.address.isNotEmpty
        ? customerProvider.address
        : (user != null && user.address != null && user.address!.isNotEmpty
            ? user.address!
            : 'Plot 42, Green Avenue, Main Road');

    final String primaryArea = customerProvider.area.isNotEmpty
        ? customerProvider.area
        : (user != null && user.assignedArea.isNotEmpty ? user.assignedArea : 'Madhapur');

    final String primaryLandmark = customerProvider.landmark.isNotEmpty
        ? customerProvider.landmark
        : (customerProvider.customerData?['landmark']?.toString() ?? 'Near Community Park Gate');

    final String deliveryBoy = customerProvider.deliveryBoyName.isNotEmpty
        ? customerProvider.deliveryBoyName
        : 'Assigned Morning Route Partner';

    final String deliverySlot = customerProvider.deliverySlot.isNotEmpty
        ? customerProvider.deliverySlot
        : '5:30 AM – 7:30 AM (Daily Early Morning)';

    // Saved addresses list from CustomerProvider
    final List<Map<String, dynamic>> rawSaved = customerProvider.savedAddresses;

    // Filter secondary / alternate addresses (addresses that are not default)
    final List<Map<String, dynamic>> secondaryAddresses = [];
    Map<String, dynamic>? defaultAddrFromSaved;

    for (final addr in rawSaved) {
      if (addr['isDefault'] == true) {
        defaultAddrFromSaved = addr;
      } else {
        secondaryAddresses.add(addr);
      }
    }

    final String activeDisplayAddress = defaultAddrFromSaved != null
        ? (defaultAddrFromSaved['apartmentStreet']?.toString() ?? primaryAddressStr)
        : primaryAddressStr;

    final String activeDisplayArea = defaultAddrFromSaved != null
        ? (defaultAddrFromSaved['area']?.toString() ?? primaryArea)
        : primaryArea;

    final String activeDisplayLandmark = defaultAddrFromSaved != null
        ? (defaultAddrFromSaved['landmark']?.toString() ?? primaryLandmark)
        : primaryLandmark;

    final num? activeLat = defaultAddrFromSaved != null && defaultAddrFromSaved['latitude'] is num
        ? defaultAddrFromSaved['latitude'] as num
        : customerProvider.latitude;
    final num? activeLng = defaultAddrFromSaved != null && defaultAddrFromSaved['longitude'] is num
        ? defaultAddrFromSaved['longitude'] as num
        : customerProvider.longitude;

    final String activeDropInstruction = defaultAddrFromSaved != null &&
            defaultAddrFromSaved['deliveryInstructions']?.toString().isNotEmpty == true
        ? defaultAddrFromSaved['deliveryInstructions'].toString()
        : _dropInstruction;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAF9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0C2340)),
          onPressed: () => Navigator.pop(context),
          tooltip: 'Back',
        ),
        title: const Text(
          'Delivery Addresses',
          style: TextStyle(
            color: Color(0xFF0C2340),
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.2,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_location_alt_rounded, color: Color(0xFF0D5C3A)),
            tooltip: 'Add Address',
            onPressed: () => _showAddAddressSheet(context, customerProvider, auth),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFEAEFEB), height: 1),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Section Header with "+ Add Address" button
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Doorstep Delivery Addresses',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0C2340),
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Manage your active drop destination and alternates.',
                        style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: () => _showAddAddressSheet(context, customerProvider, auth),
                  icon: const Icon(Icons.add_rounded, size: 16, color: Colors.white),
                  label: const Text(
                    'Add Address',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0D5C3A),
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // SECTION 1: PRESENT PRIMARY ACTIVE DELIVERY ADDRESS
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF0D5C3A), width: 1.8),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0D5C3A).withValues(alpha: 0.08),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Status Header (Primary Badge)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: const BoxDecoration(
                      color: Color(0xFFE2F1EA),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: Color(0xFF0D5C3A),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.check, size: 12, color: Colors.white),
                              ),
                              const SizedBox(width: 8),
                              const Flexible(
                                child: Text(
                                  'DEFAULT MORNING DROP (PRIMARY)',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0D5C3A),
                                    letterSpacing: 0.5,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFB5DEC8)),
                          ),
                          child: Text(
                            defaultAddrFromSaved?['label']?.toString() ?? 'Home',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Card Content
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF3F7F4),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.home_rounded, color: Color(0xFF0D5C3A), size: 22),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    activeDisplayAddress,
                                    style: const TextStyle(
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF0C2340),
                                      height: 1.3,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 4,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFEFF6FF),
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(color: const Color(0xFFBFDBFE)),
                                        ),
                                        child: Text(
                                          'Area: $activeDisplayArea',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF1D4ED8),
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Text(
                                          'City: Hyderabad, 500081',
                                          style: TextStyle(fontSize: 11, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 14),
                        const Divider(height: 1, color: Color(0xFFE2EBE5)),
                        const SizedBox(height: 12),

                        // Landmark & Drop instructions
                        _buildMetaItem(
                          icon: Icons.near_me_outlined,
                          label: 'Landmark',
                          value: activeDisplayLandmark.isNotEmpty ? activeDisplayLandmark : 'None provided',
                        ),
                        const SizedBox(height: 8),
                        _buildMetaItem(
                          icon: Icons.wb_sunny_outlined,
                          label: 'Morning Slot',
                          value: deliverySlot,
                        ),
                        const SizedBox(height: 8),
                        _buildMetaItem(
                          icon: Icons.speaker_notes_outlined,
                          label: 'Drop Instruction',
                          value: activeDropInstruction,
                        ),
                        const SizedBox(height: 8),
                        _buildMetaItem(
                          icon: Icons.delivery_dining_rounded,
                          label: 'Assigned Driver',
                          value: deliveryBoy,
                        ),

                        if (activeLat != null && activeLng != null) ...[
                          const SizedBox(height: 10),
                          InkWell(
                            onTap: () => LauncherService.openMap(lat: activeLat, lng: activeLng, address: activeDisplayAddress),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFBFDBFE)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.navigation_rounded, size: 14, color: Color(0xFF1D4ED8)),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      'GPS Pin: ${activeLat.toStringAsFixed(4)}, ${activeLng.toStringAsFixed(4)} (Tap to open Map)',
                                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF1D4ED8)),
                                    ),
                                  ),
                                  const Icon(Icons.open_in_new_rounded, size: 13, color: Color(0xFF1D4ED8)),
                                ],
                              ),
                            ),
                          ),
                        ],

                        const SizedBox(height: 16),

                        // Action Buttons: Edit Address & Contact Driver
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: Color(0xFF0D5C3A)),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                ),
                                icon: const Icon(Icons.edit_outlined, size: 16, color: Color(0xFF0D5C3A)),
                                label: const Text(
                                  'Edit Address',
                                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                                ),
                                onPressed: () => _showEditAddressSheet(
                                  context,
                                  customerProvider,
                                  auth,
                                  addressItem: defaultAddrFromSaved,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF0D5C3A),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  elevation: 0,
                                ),
                                icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16, color: Colors.white),
                                label: const Text(
                                  'Contact Driver',
                                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Colors.white),
                                ),
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => const ContactSupportScreen()),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // SECTION 2: SAVED ALTERNATE ADDRESSES WITH "SET AS PRIMARY"
            if (secondaryAddresses.isNotEmpty) ...[
              const Text(
                'Other Saved Addresses',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0C2340),
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Switch your primary drop location anytime by clicking "Set as Primary Address".',
                style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 12),

              ...secondaryAddresses.map((addr) {
                final addrId = addr['id']?.toString() ?? addr['_id']?.toString() ?? '';
                final addrLabel = addr['label']?.toString() ?? 'Alternate';
                final addrStreet = addr['apartmentStreet']?.toString() ?? addr['address']?.toString() ?? '';
                final addrArea = addr['area']?.toString() ?? 'Madhapur';
                final addrLandmark = addr['landmark']?.toString() ?? '';
                final addrInst = addr['deliveryInstructions']?.toString() ?? '';

                return Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Card Header
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                addrLabel,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF475569)),
                              ),
                            ),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, size: 18, color: Color(0xFF0D5C3A)),
                                  visualDensity: VisualDensity.compact,
                                  onPressed: () => _showEditAddressSheet(context, customerProvider, auth, addressItem: addr),
                                  tooltip: 'Edit',
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Color(0xFFDC2626)),
                                  visualDensity: VisualDensity.compact,
                                  onPressed: () => _handleDeleteAddress(addrId, customerProvider),
                                  tooltip: 'Delete',
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // Street & Area
                        Text(
                          addrStreet,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0C2340),
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'Area: $addrArea',
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF1D4ED8)),
                              ),
                            ),
                            if (addrLandmark.isNotEmpty)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Text(
                                  'Near: $addrLandmark',
                                  style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                                ),
                              ),
                          ],
                        ),

                        if (addrInst.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Note: $addrInst',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontStyle: FontStyle.italic),
                          ),
                        ],

                        Builder(builder: (_) {
                          final num? addrLat = addr['latitude'] is num ? addr['latitude'] as num : null;
                          final num? addrLng = addr['longitude'] is num ? addr['longitude'] as num : null;
                          if (addrLat != null && addrLng != null) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: InkWell(
                                onTap: () => LauncherService.openMap(lat: addrLat, lng: addrLng, address: addrStreet),
                                borderRadius: BorderRadius.circular(6),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEFF6FF),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFFBFDBFE)),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.navigation_rounded, size: 12, color: Color(0xFF1D4ED8)),
                                      const SizedBox(width: 4),
                                      Text(
                                        'GPS: ${addrLat.toStringAsFixed(4)}, ${addrLng.toStringAsFixed(4)}',
                                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF1D4ED8)),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        }),

                        const SizedBox(height: 14),
                        const Divider(height: 1, color: Color(0xFFF1F5F9)),
                        const SizedBox(height: 12),

                        // Prominent "Set as Primary Address" Button
                        SizedBox(
                          width: double.infinity,
                          height: 40,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0D5C3A),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              elevation: 0,
                            ),
                            icon: const Icon(Icons.check_circle_outline_rounded, size: 16, color: Colors.white),
                            label: const Text(
                              'Set as Primary Address',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                            onPressed: () => _handleSetPrimary(addrId, addr, customerProvider),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],

            // Add Address Card (Banner style)
            InkWell(
              onTap: () => _showAddAddressSheet(context, customerProvider, auth),
              borderRadius: BorderRadius.circular(18),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFCBD5E1), style: BorderStyle.solid),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: const Icon(Icons.add_location_alt_outlined, color: Color(0xFF0D5C3A), size: 22),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '+ Add Another Address',
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0C2340),
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Add work, parents house, or weekend stay delivery spot.',
                            style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),

            // ROUTE COVERAGE TERRITORIES CARD
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2EBE5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.map_rounded, size: 18, color: Color(0xFF0D5C3A)),
                      SizedBox(width: 8),
                      Text(
                        'Active Delivery Service Areas',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0C2340),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Natural Milk Dairy operates silent early morning chilled deliveries in the following Hyderabad zones:',
                    style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      'Madhapur (Zone 1)',
                      'Gachibowli (Zone 2)',
                      'Hitec City',
                      'Kondapur',
                      'Jubilee Hills',
                      'Banjara Hills',
                      'Financial District',
                      'Kukatpally',
                      'Manikonda',
                    ].map((z) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F7F4),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2EBE5)),
                        ),
                        child: Text(
                          z,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0D5C3A)),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildMetaItem({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 15, color: const Color(0xFF94A3B8)),
        const SizedBox(width: 8),
        SizedBox(
          width: 105,
          child: Text(
            label,
            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
          ),
        ),
      ],
    );
  }
}
