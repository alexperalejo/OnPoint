/* global chrome */
import { useState, useEffect } from 'react';
import { useChromeStorageSync } from 'use-chrome-storage';
import { useTranslation } from '../utils/translation';
import './UserProfile.css';


const DEFAULT_NOTIFICATIONS = {
  checkoutReminders: true,
  monthlyReports: true,
  newCardSuggestions: true,
  rewardAlerts: true,
  newCardReleases: false
};

export default function UserProfile({ onSignOut }) {
  const translate = useTranslation('account');
  const [cardinfo] = useChromeStorageSync('cardinfo', []);
  const cardsCount = Array.isArray(cardinfo) ? cardinfo.length : 0;
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [spendingLimits, setSpendingLimits] = useState({
    daily: '',
    weekly: '',
    monthly: ''
  });

  // Load saved preferences on mount
  useEffect(() => {
    chrome.storage.local.get(['notificationPrefs', 'spendingLimits'], (data) => {
      if (data.notificationPrefs) setNotifications(data.notificationPrefs);
      if (data.spendingLimits) setSpendingLimits(data.spendingLimits);
    });
  }, []);

  const notificationCount = Object.values(notifications).filter(Boolean).length;
  const total = Object.keys(notifications).length;

  const toggleNotification = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    chrome.storage.local.set({ notificationPrefs: updated });
  };

  const handleLimitChange = (period, value) => {
    const updated = { ...spendingLimits, [period]: value };
    setSpendingLimits(updated);
    chrome.storage.local.set({ spendingLimits: updated });
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all your data? This cannot be undone.')) {
      chrome.storage.local.clear();
      chrome.storage.sync.clear();
      onSignOut && onSignOut();
    }
  };

  return (
    <div className="profile-shell">
      <div className="profile-header-card">
        <h2 className="profile-title">{translate('.title')}</h2>
        <p className="profile-subtitle">{translate('.subtitle')}</p>
      </div>

      <div className="profile-info-card">
        <div className="stats-grid">
          <div className="stat-item blue">
            <p className="stat-label">{translate('.cards-in-wallet')}</p>
            <p className="stat-value">{cardsCount}</p>
          </div>
          <div className="stat-item green">
            <p className="stat-label">{translate('.active-notifications')}</p>
            <p className="stat-value">{notificationCount} / {total}</p>
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
              <p className="notification-title">{translate('.notifications.checkout-reminders')}</p>
              <p className="notification-desc">
                Auto-popup when a checkout page is detected so you never miss a reward
              </p>
            </div>
            <button
              className={`status-badge ${notifications.checkoutReminders ? 'on' : 'off'}`}
              onClick={() => toggleNotification('checkoutReminders')}
            >
              {notifications.checkoutReminders ? 'On' : 'Off'}
            </button>
          </div>

          <div className="notification-item">
            <div>
              <p className="notification-title">Monthly Reports</p>
              <p className="notification-desc">
                Summary of total rewards earned across all cards each month
              </p>
            </div>
            <button
              className={`status-badge ${notifications.monthlyReports ? 'on' : 'off'}`}
              onClick={() => toggleNotification('monthlyReports')}
            >
              {notifications.monthlyReports ? 'On' : 'Off'}
            </button>
          </div>

          <div className="notification-item">
            <div>
              <p className="notification-title">Card Recommendations</p>
              <p className="notification-desc">
                Get notified when a better card exists for your most frequent shopping categories
              </p>
            </div>
            <button
              className={`status-badge ${notifications.newCardSuggestions ? 'on' : 'off'}`}
              onClick={() => toggleNotification('newCardSuggestions')}
            >
              {notifications.newCardSuggestions ? 'On' : 'Off'}
            </button>
          </div>

          <div className="notification-item">
            <div>
              <p className="notification-title">Reward Alerts</p>
              <p className="notification-desc">
                Alerts for expiring rewards and limited-time bonus opportunities
              </p>
            </div>
            <button
              className={`status-badge ${notifications.rewardAlerts ? 'on' : 'off'}`}
              onClick={() => toggleNotification('rewardAlerts')}
            >
              {notifications.rewardAlerts ? 'On' : 'Off'}
            </button>
          </div>

          <div className="notification-item">
            <div>
              <p className="notification-title">New Card Releases</p>
              <p className="notification-desc">
                Get notified when new credit cards are added to the OnPoint library
              </p>
            </div>
            <button
              className={`status-badge ${notifications.newCardReleases ? 'on' : 'off'}`}
              onClick={() => toggleNotification('newCardReleases')}
            >
              {notifications.newCardReleases ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>

      {/* Spending Limits */}
      <div className="spending-limits-card">
        <h4 className="section-heading">
          <span className="section-icon">💰</span>
          Spending Limits
        </h4>
        <p className="profile-subtitle">
          Set limits to get warned when you're approaching your budget
        </p>

        <div className="limits-grid">
          <div className="limit-item">
            <label className="limit-label">Daily Limit</label>
            <div className="limit-input-wrap">
              <span className="limit-prefix">$</span>
              <input
                type="number"
                className="limit-input"
                placeholder="0.00"
                value={spendingLimits.daily}
                onChange={(e) => handleLimitChange('daily', e.target.value)}
              />
            </div>
          </div>

          <div className="limit-item">
            <label className="limit-label">Weekly Limit</label>
            <div className="limit-input-wrap">
              <span className="limit-prefix">$</span>
              <input
                type="number"
                className="limit-input"
                placeholder="0.00"
                value={spendingLimits.weekly}
                onChange={(e) => handleLimitChange('weekly', e.target.value)}
              />
            </div>
          </div>

          <div className="limit-item">
            <label className="limit-label">Monthly Limit</label>
            <div className="limit-input-wrap">
              <span className="limit-prefix">$</span>
              <input
                type="number"
                className="limit-input"
                placeholder="0.00"
                value={spendingLimits.monthly}
                onChange={(e) => handleLimitChange('monthly', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="actions-card">
        <h4 className="section-heading">Account Actions</h4>
        <button className="signout-btn" onClick={handleClearData}>
          <span>🗑️</span>
          Delete / Clear All Information
        </button>
        <p className="signout-note">
          This will permanently clear your wallet, savings data, and preferences.
        </p>
      </div>
    </div>
  );
}