import './UserProfile.css';

export default function UserProfile({ onSignOut }) {
  const userData = {
    name: 'dfasfa',
    email: 'justin@gmail.com',
    cardsCount: 0,
    notifications: {
      checkoutReminders: true,
      monthlyReports: true,
      newCardSuggestions: false,
      rewardAlerts: true
    }
  };

  const notificationCount = Object.values(userData.notifications).filter(Boolean).length;

  return (
    <div className="profile-shell">
      <div className="profile-header-card">
        <h2 className="profile-title">Account Settings</h2>
        <p className="profile-subtitle">
          Manage your profile, notification preferences, and account data
        </p>
      </div>

      <div className="profile-info-card">
        <div className="profile-user-row">
          <div className="user-avatar">
            {userData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D'}
          </div>
          <div className="user-details">
            <h3 className="user-name">{userData.name}</h3>
            <p className="user-email">{userData.email}</p>
          </div>
        </div>

        <div className="account-section">
          <h4 className="section-heading">
            <span className="section-icon">👤</span>
            Account Information
          </h4>

          <div className="info-grid">
            <div className="info-item">
              <p className="info-label">Full Name</p>
              <p className="info-value">{userData.name}</p>
            </div>
            <div className="info-item">
              <p className="info-label">Email Address</p>
              <p className="info-value">{userData.email}</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-item blue">
              <p className="stat-label">Cards in Wallet</p>
              <p className="stat-value">{userData.cardsCount}</p>
            </div>
            <div className="stat-item green">
              <p className="stat-label">Active Notifications</p>
              <p className="stat-value">{notificationCount} / 4</p>
            </div>
          </div>
        </div>
      </div>

      <div className="notifications-card">
        <h4 className="section-heading">
          <span className="section-icon">🔔</span>
          Notification Preferences
        </h4>

        <div className="notification-list">
          <div className="notification-item">
            <div>
              <p className="notification-title">Checkout Reminders</p>
              <p className="notification-desc">Remind you to use the best card at checkout</p>
            </div>
            <span className={`status-badge ${userData.notifications.checkoutReminders ? 'on' : 'off'}`}>
              {userData.notifications.checkoutReminders ? 'On' : 'Off'}
            </span>
          </div>

          <div className="notification-item">
            <div>
              <p className="notification-title">Monthly Reports</p>
              <p className="notification-desc">Summary of rewards earned each month</p>
            </div>
            <span className={`status-badge ${userData.notifications.monthlyReports ? 'on' : 'off'}`}>
              {userData.notifications.monthlyReports ? 'On' : 'Off'}
            </span>
          </div>

          <div className="notification-item">
            <div>
              <p className="notification-title">New Card Suggestions</p>
              <p className="notification-desc">Personalized card recommendations</p>
            </div>
            <span className={`status-badge ${userData.notifications.newCardSuggestions ? 'on' : 'off'}`}>
              {userData.notifications.newCardSuggestions ? 'On' : 'Off'}
            </span>
          </div>

          <div className="notification-item">
            <div>
              <p className="notification-title">Reward Alerts</p>
              <p className="notification-desc">Expiring rewards and bonus opportunities</p>
            </div>
            <span className={`status-badge ${userData.notifications.rewardAlerts ? 'on' : 'off'}`}>
              {userData.notifications.rewardAlerts ? 'On' : 'Off'}
            </span>
          </div>
        </div>

        <div className="notification-note">
          <p>💡 To update your notification preferences, you'll need to go through the setup again.</p>
        </div>
      </div>

      <div className="actions-card">
        <h4 className="section-heading">Account Actions</h4>
        {onSignOut && (
          <>
            <button className="signout-btn" onClick={onSignOut}>
              <span>🚪</span>
              Log Out
            </button>
            <p className="signout-note">
              Logging out will return you to the landing page.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
