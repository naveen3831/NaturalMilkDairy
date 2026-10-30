const fs = require('fs');

// ==========================================
// 1. UPDATE CustomerPortal.jsx
// ==========================================
let cp = fs.readFileSync('client/src/pages/customer/CustomerPortal.jsx', 'utf8');

// Add states if not present
if (!cp.includes('showUpgradeModal')) {
  cp = cp.replace(
    'const [selectedUpcomingDelivery, setSelectedUpcomingDelivery] = useState(null);',
    `const [selectedUpcomingDelivery, setSelectedUpcomingDelivery] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const [extendingSub, setExtendingSub] = useState(false);`
  );
}

// In renderSubscriptionDetailsModal, add Upgrade and Extend options
const webManageOptions = `            {/* Upgrade Plan Option */}
            <div
              onClick={() => setShowUpgradeModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#f0fdf4',
                border: '1.2px solid #bbf7d0',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Upgrade Plan</strong>
                  <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>Increase quantity, switch to A2 or combo</span>
                </div>
              </div>
              <ChevronRight size={18} color="#15803d" />
            </div>

            {/* Extend Subscription Option */}
            <div
              onClick={() => setShowExtendModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#fffbeb',
                border: '1.2px solid #fde68a',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarDays size={20} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Extend Subscription</strong>
                  <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>Add 7, 15, 30 or 60 days to current plan</span>
                </div>
              </div>
              <ChevronRight size={18} color="#d97706" />
            </div>
`;

if (!cp.includes("Upgrade Plan</strong>") && cp.includes("/* Row 1: Pause Delivery for a Trip */")) {
  cp = cp.replace(
    '{/* Row 1: Pause Delivery for a Trip */}',
    webManageOptions + '\r\n            {/* Row 1: Pause Delivery for a Trip */}'
  );
}

// In mobile view of renderSubscriptionDetailsModal, ensure paddingBottom and render CustomerBottomNav
const mobileModalOld = `    if (isMobile) {
      return (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: '#f9faf9',
            overflowY: 'auto',
            padding: '16px 16px 36px 16px',
          }}
        >
          {content}
        </div>
      );
    }`;

const mobileModalNew = `    if (isMobile) {
      return (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: '#f9faf9',
            overflowY: 'auto',
            padding: '16px 16px 86px 16px',
          }}
        >
          {content}
          <CustomerBottomNav
            activePage="subscription"
            onNavigate={(tab) => {
              setSelectedSubForDetails(null);
              if (typeof setActiveTab === 'function') setActiveTab(tab);
            }}
            items={CUSTOMER_HOME_NAV_ITEMS}
            className="customer-mobile-bottom-nav"
          />
        </div>
      );
    }`;

if (cp.includes(mobileModalOld)) {
  cp = cp.replace(mobileModalOld, mobileModalNew);
}

// Add the Upgrade Plan Modal & Extend Subscription Modal renderer
const upgradeAndExtendModals = `
  // Upgrade Plan Modal Component
  const renderUpgradePlanModal = () => {
    return (
      <div
        className="modal-overlay"
        onClick={() => setShowUpgradeModal(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '16px',
        }}
      >
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '480px',
            width: '100%',
            borderRadius: '24px',
            background: '#ffffff',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2ebe5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0c2340' }}>Upgrade Plan</h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>Realtime database update with delivery partner</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowUpgradeModal(false)}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setUpgradingPlan(true);
              try {
                const formData = new FormData(e.currentTarget);
                const milkQty = parseInt(formData.get('milkQty'), 10) || 2;
                const milkType = formData.get('milkType') || 'Pure A2 Cow Milk';
                const curdQty = parseInt(formData.get('curdQty'), 10) || 0;

                const res = await fetch('/api/customers/me/upgrade-plan', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                  body: JSON.stringify({
                    milkQty,
                    curdQty,
                    milkType,
                    planName: \`Daily Farm Pure \${milkType.split(' ')[0]} Plan (\${milkQty}L)\`,
                    frequency: 'daily',
                    actor: user?.name || 'Customer',
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  setShowUpgradeModal(false);
                  alert(\`Plan upgraded successfully to \${milkQty}L \${milkType} daily! Synced in realtime.\`);
                  if (typeof reloadLedger === 'function') reloadLedger();
                } else {
                  alert(data.message || 'Unable to upgrade plan.');
                }
              } catch (err) {
                alert('Upgrade failed: ' + err.message);
              } finally {
                setUpgradingPlan(false);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                DAILY MILK QUANTITY
              </label>
              <select
                name="milkQty"
                defaultValue="2"
                style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#0c2340', background: '#f8fafc' }}
              >
                <option value="1">1 Litre / day (Standard)</option>
                <option value="2">2 Litres / day (Family Pack - Recommended)</option>
                <option value="3">3 Litres / day (Plus Pack)</option>
                <option value="4">4 Litres / day (Extra Value)</option>
                <option value="5">5 Litres / day (Jumbo Pack)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                PREMIUM MILK VARIANT
              </label>
              <select
                name="milkType"
                defaultValue="Pure A2 Cow Milk"
                style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#0c2340', background: '#f8fafc' }}
              >
                <option value="Pure A2 Cow Milk">Pure A2 Desi Cow Milk (₹60/L)</option>
                <option value="Rich Buffalo Milk">Rich High-Cream Buffalo Milk (₹75/L)</option>
                <option value="Organic Farm Milk">Organic Farm Fresh Whole Milk (₹65/L)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                ADD FRESH ARTISANAL CLAY-POT CURD
              </label>
              <select
                name="curdQty"
                defaultValue="0"
                style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#0c2340', background: '#f8fafc' }}
              >
                <option value="0">No Curd (0g)</option>
                <option value="500">500g Fresh Curd Daily (+₹30/day)</option>
                <option value="1000">1000g (1kg) Fresh Curd Daily (+₹60/day)</option>
              </select>
            </div>

            <div style={{ background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', padding: '10px 14px', fontSize: '0.75rem', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#15803d" />
              <span>⚡ Realtime sync: Updates delivery partner app and admin console instantly.</span>
            </div>

            <button
              type="submit"
              disabled={upgradingPlan}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                border: 'none',
                background: '#0d5c3a',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.94rem',
                cursor: upgradingPlan ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
                marginTop: '6px',
              }}
            >
              {upgradingPlan ? 'Upgrading in Database...' : 'Confirm & Upgrade Plan'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // Extend Subscription Modal Component
  const renderExtendSubscriptionModal = () => {
    return (
      <div
        className="modal-overlay"
        onClick={() => setShowExtendModal(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '16px',
        }}
      >
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '480px',
            width: '100%',
            borderRadius: '24px',
            background: '#ffffff',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2ebe5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarDays size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0c2340' }}>Extend Subscription</h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>Continue uninterrupted morning deliveries</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowExtendModal(false)}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setExtendingSub(true);
              try {
                const formData = new FormData(e.currentTarget);
                const days = parseInt(formData.get('days'), 10) || 30;

                const res = await fetch('/api/customers/me/extend-subscription', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                  body: JSON.stringify({
                    days,
                    actor: user?.name || 'Customer',
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  setShowExtendModal(false);
                  alert(data.message || \`Subscription extended by \${days} days!\`);
                  if (typeof reloadLedger === 'function') reloadLedger();
                } else {
                  alert(data.message || 'Unable to extend subscription.');
                }
              } catch (err) {
                alert('Extension failed: ' + err.message);
              } finally {
                setExtendingSub(false);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>
                CHOOSE EXTENSION DURATION
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { days: 7, label: '+7 Days (1 Week)', desc: 'Quick Extension • 7 Drops', badge: 'Flexible' },
                  { days: 15, label: '+15 Days (Half Month)', desc: '15 Scheduled Drops', badge: 'Popular' },
                  { days: 30, label: '+30 Days (1 Full Month)', desc: '30 Scheduled Drops', badge: 'Best Value' },
                  { days: 60, label: '+60 Days (2 Months)', desc: '60 Scheduled Drops • Save 10%', badge: 'Maximum Savings' },
                ].map((item) => (
                  <label
                    key={item.days}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.2px solid #e2ebe5',
                      background: '#f8fafc',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="radio" name="days" value={item.days} defaultChecked={item.days === 30} style={{ accentColor: '#0d5c3a', width: '16px', height: '16px' }} />
                      <div>
                        <strong style={{ fontSize: '0.86rem', color: '#0c2340', display: 'block' }}>{item.label}</strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.desc}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0d5c3a', background: '#dcfce7', padding: '2px 8px', borderRadius: '8px' }}>
                      {item.badge}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a', padding: '10px 14px', fontSize: '0.75rem', color: '#92400e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#d97706" />
              <span>⚡ Realtime sync: Stored in database & delivery partner route continues seamlessly.</span>
            </div>

            <button
              type="submit"
              disabled={extendingSub}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                border: 'none',
                background: '#0d5c3a',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.94rem',
                cursor: extendingSub ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
                marginTop: '6px',
              }}
            >
              {extendingSub ? 'Extending in Database...' : 'Confirm & Extend Subscription'}
            </button>
          </form>
        </div>
      </div>
    );
  };
`;

if (!cp.includes('renderUpgradePlanModal')) {
  // Put modals right above renderSubscriptionDetailsModal
  cp = cp.replace(
    '  const renderSubscriptionDetailsModal = () => {',
    upgradeAndExtendModals + '\r\n  const renderSubscriptionDetailsModal = () => {'
  );

  // Render modal in main modals list
  cp = cp.replace(
    '{selectedUpcomingDelivery && renderUpcomingDeliveryDetailsModal()}',
    `{selectedUpcomingDelivery && renderUpcomingDeliveryDetailsModal()}
      {showUpgradeModal && renderUpgradePlanModal()}
      {showExtendModal && renderExtendSubscriptionModal()}`
  );
}

fs.writeFileSync('client/src/pages/customer/CustomerPortal.jsx', cp, 'utf8');
console.log('CustomerPortal.jsx updated successfully');

// ==========================================
// 2. UPDATE SubscriptionPage.jsx
// ==========================================
let sp = fs.readFileSync('client/src/pages/SubscriptionPage.jsx', 'utf8');

// Ensure CustomerBottomNav is imported
if (!sp.includes('CustomerBottomNav')) {
  sp = sp.replace(
    "import { useAuth } from '../context/AuthContext';",
    `import { useAuth } from '../context/AuthContext';\r\nimport CustomerBottomNav, { CUSTOMER_HOME_NAV_ITEMS } from '../components/CustomerBottomNav';`
  );
}

// Add state for upgrade & extend in SubscriptionPage
if (!sp.includes('showUpgradeModal')) {
  sp = sp.replace(
    'const [selectedWeekdayIndex, setSelectedWeekdayIndex] = useState(0);',
    `const [selectedWeekdayIndex, setSelectedWeekdayIndex] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const [extendingSub, setExtendingSub] = useState(false);`
  );
}

// In SubscriptionPage Manage Subscription, add Upgrade and Extend rows
const spManageOptions = `            {/* Option 1: Upgrade Plan */}
            <div
              onClick={() => setShowUpgradeModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#f0fdf4',
                border: '1.2px solid #bbf7d0',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Upgrade Plan</strong>
                  <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>Increase quantity, switch to A2 or combo</span>
                </div>
              </div>
              <ChevronRight size={18} color="#15803d" />
            </div>

            {/* Option 2: Extend Subscription */}
            <div
              onClick={() => setShowExtendModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#fffbeb',
                border: '1.2px solid #fde68a',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarDays size={20} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Extend Subscription</strong>
                  <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>Add 7, 15, 30 or 60 days to current plan</span>
                </div>
              </div>
              <ChevronRight size={18} color="#d97706" />
            </div>
`;

if (!sp.includes("Upgrade Plan</strong>") && sp.includes("{/* Card 1: Pause */}")) {
  sp = sp.replace(
    '{/* Card 1: Pause */}',
    spManageOptions + '\r\n            {/* Card 1: Pause */}'
  );
}

// In renderMobileDetails, add CustomerBottomNav and adjust padding
if (!sp.includes('className="customer-mobile-bottom-nav"') && sp.includes('minHeight: \'100vh\', background: \'#f9faf9\', padding: \'16px 16px 36px 16px\'')) {
  sp = sp.replace(
    'padding: \'16px 16px 36px 16px\'',
    'padding: \'16px 16px 86px 16px\''
  );
  sp = sp.replace(
    '        <button\r\n          type="button"\r\n          onClick={() => {\r\n            setShowMobileDetails(false);\r\n            if (typeof setActiveTab === \'function\') setActiveTab(\'products\');\r\n          }}\r\n          style={{\r\n            width: \'100%\',\r\n            height: \'50px\',\r\n            borderRadius: \'16px\',\r\n            border: \'none\',\r\n            background: \'#0d5c3a\',\r\n            color: \'#ffffff\',\r\n            fontWeight: 800,\r\n            fontSize: \'0.92rem\',\r\n            cursor: \'pointer\',\r\n            display: \'flex\',\r\n            alignItems: \'center\',\r\n            justifyContent: \'center\',\r\n            gap: \'8px\',\r\n            boxShadow: \'0 4px 12px rgba(13, 92, 58, 0.25)\',\r\n          }}\r\n        >\r\n          <LayoutGrid size={18} />\r\n          <span>Explore More Plans</span>\r\n        </button>\r\n      </div>',
    `        <button
          type="button"
          onClick={() => {
            setShowMobileDetails(false);
            if (typeof setActiveTab === 'function') setActiveTab('products');
          }}
          style={{
            width: '100%',
            height: '50px',
            borderRadius: '16px',
            border: 'none',
            background: '#0d5c3a',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(13, 92, 58, 0.25)',
          }}
        >
          <LayoutGrid size={18} />
          <span>Explore More Plans</span>
        </button>

        {/* Persistent Bottom Bar on Subscription Details */}
        <CustomerBottomNav
          activePage="subscription"
          onNavigate={(tab) => {
            setShowMobileDetails(false);
            if (typeof setActiveTab === 'function') setActiveTab(tab);
          }}
          items={CUSTOMER_HOME_NAV_ITEMS}
          className="customer-mobile-bottom-nav"
        />

        {/* Modals for Upgrade and Extend */}
        {showUpgradeModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowUpgradeModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100000,
              padding: '16px',
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '480px',
                width: '100%',
                borderRadius: '24px',
                background: '#ffffff',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2ebe5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0c2340' }}>Upgrade Plan</h3>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>Realtime database update with delivery partner</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setUpgradingPlan(true);
                  try {
                    const formData = new FormData(e.currentTarget);
                    const milkQty = parseInt(formData.get('milkQty'), 10) || 2;
                    const milkType = formData.get('milkType') || 'Pure A2 Cow Milk';
                    const curdQty = parseInt(formData.get('curdQty'), 10) || 0;

                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/customers/me/upgrade-plan', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: 'Bearer ' + token } : {}),
                      },
                      body: JSON.stringify({
                        milkQty,
                        curdQty,
                        milkType,
                        planName: \`Daily Farm Pure \${milkType.split(' ')[0]} Plan (\${milkQty}L)\`,
                        frequency: 'daily',
                        actor: user?.name || 'Customer',
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setShowUpgradeModal(false);
                      alert(\`Plan upgraded successfully to \${milkQty}L \${milkType} daily! Synced in realtime.\`);
                    } else {
                      alert(data.message || 'Unable to upgrade plan.');
                    }
                  } catch (err) {
                    alert('Upgrade failed: ' + err.message);
                  } finally {
                    setUpgradingPlan(false);
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>DAILY MILK QUANTITY</label>
                  <select name="milkQty" defaultValue="2" style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#0c2340', background: '#f8fafc' }}>
                    <option value="1">1 Litre / day (Standard)</option>
                    <option value="2">2 Litres / day (Family Pack - Recommended)</option>
                    <option value="3">3 Litres / day (Plus Pack)</option>
                    <option value="4">4 Litres / day (Extra Value)</option>
                    <option value="5">5 Litres / day (Jumbo Pack)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>PREMIUM MILK VARIANT</label>
                  <select name="milkType" defaultValue="Pure A2 Cow Milk" style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#0c2340', background: '#f8fafc' }}>
                    <option value="Pure A2 Cow Milk">Pure A2 Desi Cow Milk (₹60/L)</option>
                    <option value="Rich Buffalo Milk">Rich High-Cream Buffalo Milk (₹75/L)</option>
                    <option value="Organic Farm Milk">Organic Farm Fresh Whole Milk (₹65/L)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>ADD FRESH ARTISANAL CLAY-POT CURD</label>
                  <select name="curdQty" defaultValue="0" style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#0c2340', background: '#f8fafc' }}>
                    <option value="0">No Curd (0g)</option>
                    <option value="500">500g Fresh Curd Daily (+₹30/day)</option>
                    <option value="1000">1000g (1kg) Fresh Curd Daily (+₹60/day)</option>
                  </select>
                </div>

                <div style={{ background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', padding: '10px 14px', fontSize: '0.75rem', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#15803d" />
                  <span>⚡ Realtime sync: Updates delivery partner app and admin console instantly.</span>
                </div>

                <button
                  type="submit"
                  disabled={upgradingPlan}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#0d5c3a',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.94rem',
                    cursor: upgradingPlan ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
                    marginTop: '6px',
                  }}
                >
                  {upgradingPlan ? 'Upgrading in Database...' : 'Confirm & Upgrade Plan'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal for Extend */}
        {showExtendModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowExtendModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100000,
              padding: '16px',
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '480px',
                width: '100%',
                borderRadius: '24px',
                background: '#ffffff',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2ebe5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarDays size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0c2340' }}>Extend Subscription</h3>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>Continue uninterrupted morning deliveries</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setExtendingSub(true);
                  try {
                    const formData = new FormData(e.currentTarget);
                    const days = parseInt(formData.get('days'), 10) || 30;

                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/customers/me/extend-subscription', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: 'Bearer ' + token } : {}),
                      },
                      body: JSON.stringify({
                        days,
                        actor: user?.name || 'Customer',
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setShowExtendModal(false);
                      alert(data.message || \`Subscription extended by \${days} days!\`);
                    } else {
                      alert(data.message || 'Unable to extend subscription.');
                    }
                  } catch (err) {
                    alert('Extension failed: ' + err.message);
                  } finally {
                    setExtendingSub(false);
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>CHOOSE EXTENSION DURATION</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { days: 7, label: '+7 Days (1 Week)', desc: 'Quick Extension • 7 Drops', badge: 'Flexible' },
                      { days: 15, label: '+15 Days (Half Month)', desc: '15 Scheduled Drops', badge: 'Popular' },
                      { days: 30, label: '+30 Days (1 Full Month)', desc: '30 Scheduled Drops', badge: 'Best Value' },
                      { days: 60, label: '+60 Days (2 Months)', desc: '60 Scheduled Drops • Save 10%', badge: 'Maximum Savings' },
                    ].map((item) => (
                      <label
                        key={item.days}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1.2px solid #e2ebe5',
                          background: '#f8fafc',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input type="radio" name="days" value={item.days} defaultChecked={item.days === 30} style={{ accentColor: '#0d5c3a', width: '16px', height: '16px' }} />
                          <div>
                            <strong style={{ fontSize: '0.86rem', color: '#0c2340', display: 'block' }}>{item.label}</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.desc}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0d5c3a', background: '#dcfce7', padding: '2px 8px', borderRadius: '8px' }}>
                          {item.badge}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a', padding: '10px 14px', fontSize: '0.75rem', color: '#92400e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#d97706" />
                  <span>⚡ Realtime sync: Stored in database & delivery partner route continues seamlessly.</span>
                </div>

                <button
                  type="submit"
                  disabled={extendingSub}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#0d5c3a',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.94rem',
                    cursor: extendingSub ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
                    marginTop: '6px',
                  }}
                >
                  {extendingSub ? 'Extending in Database...' : 'Confirm & Extend Subscription'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>`
  );
}

fs.writeFileSync('client/src/pages/SubscriptionPage.jsx', sp, 'utf8');
console.log('SubscriptionPage.jsx updated successfully');
