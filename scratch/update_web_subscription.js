const fs = require('fs');
const path = require('path');

// ==========================================
// 1. UPDATE CustomerPortal.jsx
// ==========================================
const portalPath = path.resolve('client/src/pages/customer/CustomerPortal.jsx');
let portalContent = fs.readFileSync(portalPath, 'utf8');

// Update Back button in renderSubscriptionDetailsModal
const oldModalBackBtn = `          <button
            type="button"
            onClick={() => setSelectedSubForDetails(null)}
            aria-label="Back"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#f3f7f4',
              border: '1px solid #e2ebe5',
              color: '#0d5c3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={20} />
          </button>`;

const newModalBackBtn = `          <button
            type="button"
            onClick={() => setSelectedSubForDetails(null)}
            aria-label="Back"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#ffffff',
              border: '1.2px solid #e2ebe5',
              color: '#0c2340',
              fontWeight: 700,
              fontSize: '0.80rem',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>`;

portalContent = portalContent.replace(oldModalBackBtn, newModalBackBtn);

// Update Next Delivery card in details modal (make it mint green matching Image 2)
const oldNextDeliveryCard = `        {/* 4. Next Delivery */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Truck size={18} color="#0d5c3a" />
            <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>Next Delivery</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: '#f3f7f4',
                  color: '#0d5c3a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CalendarDays size={19} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Tomorrow, 28 Oct 2026</strong>
                <span style={{ fontSize: '0.76rem', color: '#6b7280' }}>Before 6:30 AM</span>
              </div>
            </div>
            <ChevronRight size={19} color="#9ca3af" />
          </div>
        </div>`;

const newNextDeliveryCard = `        {/* 4. Next Delivery (Mint card matching Image 2) */}
        <div
          style={{
            background: '#e8f5ee',
            borderRadius: '20px',
            border: '1.2px solid #c8e6d5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(13, 92, 58, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Truck size={18} color="#0d5c3a" />
            <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>Next Delivery</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#d4ede0',
                  color: '#0d5c3a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CalendarDays size={19} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Tomorrow, 28 Oct 2026</strong>
                <span style={{ fontSize: '0.76rem', color: '#4b5563' }}>Before 6:30 AM</span>
              </div>
            </div>
            <ChevronRight size={19} color="#0d5c3a" />
          </div>
        </div>`;

portalContent = portalContent.replace(oldNextDeliveryCard, newNextDeliveryCard);

// Update Manage Subscription 4 cards with matching tint colors
const oldOption1Bg = `background: '#fafbfb',`;
// In Option 1 (Pause)
portalContent = portalContent.replace(
  `                background: '#fafbfb',\n                cursor: 'pointer',\n              }}\n            >\n              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>\n                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7'`,
  `                background: '#fef9ee',\n                border: '1.1px solid #fde68a',\n                cursor: 'pointer',\n              }}\n            >\n              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>\n                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7'`
);

// In Option 2 (Quantity)
portalContent = portalContent.replace(
  `                background: '#fafbfb',\n                cursor: 'pointer',\n              }}\n            >\n              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>\n                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e2f1ea'`,
  `                background: '#f0fdf4',\n                border: '1.1px solid #bbf7d0',\n                cursor: 'pointer',\n              }}\n            >\n              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>\n                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e2f1ea'`
);

// In Option 3 (Address)
portalContent = portalContent.replace(
  `                background: '#fafbfb',\n                cursor: 'pointer',\n              }}\n            >\n              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>\n                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe'`,
  `                background: '#f0f9ff',\n                border: '1.1px solid #bae6fd',\n                cursor: 'pointer',\n              }}\n            >\n              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>\n                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe'`
);

// In Option 4 (Stop)
portalContent = portalContent.replace(
  `                background: '#fff5f5',\n                cursor: 'pointer',\n              }}\n            >\n              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>\n                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fee2e2'`,
  `                background: '#fef2f2',\n                border: '1.1px solid #fecaca',\n                cursor: 'pointer',\n              }}\n            >\n              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>\n                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fee2e2'`
);

// Update Explore More Plans Button icon in details modal
portalContent = portalContent.replace(
  `            <button\n          type="button"\n          onClick={() => {\n            setSelectedSubForDetails(null);\n            const el = document.getElementById('more-subscription-plans');\n            if (el) el.scrollIntoView({ behavior: 'smooth' });\n          }}`,
  `            <button\n          type="button"\n          onClick={() => {\n            setSelectedSubForDetails(null);\n            navigateToPage('products');\n          }}`
);

// Update 4 feature badges in renderSubscriptionPage to single container with 4 columns on mobile
const old4FeatureBadges = `        {/* 4 Feature Badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '10px',
          }}
        >
          <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Leaf size={16} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>100% Pure & Natural</span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Snowflake size={16} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>Chilled to 4°C</span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Truck size={16} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>Doorstep Delivery</span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarDays size={16} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>Flexible Plans</span>
          </div>
        </div>`;

const new4FeatureBadges = `        {/* 4 Feature Badges (Single card with 4 columns matching Image 1 on mobile) */}
        {isMobile ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2ebe5',
              padding: '12px 4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Leaf size={16} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>100%<br />Pure & Natural</span>
            </div>
            <div style={{ width: '1px', height: '28px', background: '#e5ede7' }} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Snowflake size={16} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>Chilled<br />to 4°C</span>
            </div>
            <div style={{ width: '1px', height: '28px', background: '#e5ede7' }} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={16} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>Doorstep<br />Delivery</span>
            </div>
            <div style={{ width: '1px', height: '28px', background: '#e5ede7' }} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarDays size={16} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>Flexible<br />Plans</span>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
            }}
          >
            <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Leaf size={16} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>100% Pure & Natural</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Snowflake size={16} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>Chilled to 4°C</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Truck size={16} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>Doorstep Delivery</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CalendarDays size={16} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>Flexible Plans</span>
            </div>
          </div>
        )}`;

portalContent = portalContent.replace(old4FeatureBadges, new4FeatureBadges);

// Update Active Subscription 3 spec boxes on mobile
const old2MetricBoxes = `            {/* 2 Metric Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                style={{
                  background: '#f7faf8',
                  borderRadius: '12px',
                  border: '1px solid #e5ede8',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Milk size={18} color="#0d5c3a" />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15 }}>
                    {primarySub.plan?.milkQty || milkQuantity || 1} {primarySub.plan?.milkUnit || milkUnit || 'L'} / day
                  </strong>
                  <span style={{ fontSize: '0.70rem', color: '#6b7280' }}>Pure A2 Milk</span>
                </div>
              </div>

              <div
                style={{
                  background: '#f7faf8',
                  borderRadius: '12px',
                  border: '1px solid #e5ede8',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Clock3 size={18} color="#0d5c3a" />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15 }}>
                    Before 6:30 AM
                  </strong>
                  <span style={{ fontSize: '0.70rem', color: '#6b7280' }}>Morning Delivery</span>
                </div>
              </div>
            </div>

            {/* Delivery Area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#4b5563', fontWeight: 600 }}>
              <MapPin size={15} color="#0d5c3a" />
              <span>{primarySub.area || currentCustomer.area || 'Madhupur'} Delivery Area</span>
            </div>`;

const new3MetricBoxes = `            {/* 3 Metric Boxes matching Image 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: '6px' }}>
              <div
                style={{
                  background: '#f2f8f4',
                  borderRadius: '10px',
                  border: '1px solid #deede2',
                  padding: '8px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Milk size={15} color="#0d5c3a" />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {primarySub.plan?.milkQty || milkQuantity || 1} {primarySub.plan?.milkUnit || milkUnit || 'L'} / day
                  </strong>
                  <span style={{ fontSize: '0.62rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>Pure A2 Milk</span>
                </div>
              </div>

              <div
                style={{
                  background: '#f2f8f4',
                  borderRadius: '10px',
                  border: '1px solid #deede2',
                  padding: '8px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Clock3 size={15} color="#0d5c3a" />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Before 6:30 AM
                  </strong>
                  <span style={{ fontSize: '0.62rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>Morning Delivery</span>
                </div>
              </div>

              <div
                style={{
                  background: '#f2f8f4',
                  borderRadius: '10px',
                  border: '1px solid #deede2',
                  padding: '8px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MapPin size={15} color="#0d5c3a" />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {primarySub.area || currentCustomer.area || 'Madhupur'}
                  </strong>
                  <span style={{ fontSize: '0.62rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>Delivery Area</span>
                </div>
              </div>
            </div>`;

portalContent = portalContent.replace(old2MetricBoxes, new3MetricBoxes);

// Update thumbnail image to /sub_active_thumb.png
portalContent = portalContent.replace(
  `src="/product-cow-milk.jpg"\\n                alt="Daily Farm Pure Milk Plan"`,
  `src="/sub_active_thumb.png"\\n                onError={(e) => { e.currentTarget.src = '/product-cow-milk.jpg'; }}\\n                alt="Daily Farm Pure Milk Plan"`
);

// Update Hero card image in renderSubscriptionPage to /sub_hero_milk.png
portalContent = portalContent.replace(
  `src="/glass-bottles.jpg"\\n              alt="Fresh glass milk bottles"`,
  `src="/sub_hero_milk.png"\\n              alt="Fresh glass milk bottles"`
);

fs.writeFileSync(portalPath, portalContent, 'utf8');
console.log('CustomerPortal.jsx updated successfully!');
