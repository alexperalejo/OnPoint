/* global chrome */
import { useState, useEffect } from 'react';
import { useChromeStorageSync } from 'use-chrome-storage';
import { useTranslation } from '../utils/translation';
import { useDarkMode } from '../hooks/useDarkMode';
import './UserProfile.css';

const DEFAULT_NOTIFICATIONS = {
  checkoutReminders: true,
  monthlyReports: true,
  newCardSuggestions: true,
  rewardAlerts: true,
  newCardReleases: false
};

export default function UserProfile({ onSignOut }) {
  useDarkMode();
  const translate = useTranslation('account');
  const [cardinfo] = useChromeStorageSync('cardinfo', []);
  const cardsCount = Array.isArray(cardinfo) ? cardinfo.length : 0;
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [spendingLimits, setSpendingLimits] = useState({
    daily: '',
    dailyEnabled: false,
    weekly: '',
    weeklyEnabled: false,
    monthly: '',
    monthlyEnabled: false
  });

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

      {/* Header */}
      <div className="profile-header-card">
        <h2 className="profile-title">{translate('.title')}</h2>
        <p className="profile-subtitle">{translate('.subtitle')}</p>
      </div>

      {/* Stats */}
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

      {/* Two column layout */}
      <div className="account-main-grid">

        {/* Left — Notifications */}
        <div className="notifications-card">
          <h4 className="section-heading">

            {translate('.notifications.title')}
          </h4>
          <div className="notification-list">

            <div className="notification-item">
              <div>
                <p className="notification-title">{translate('.notifications.checkout-reminders')}</p>
                <p className="notification-desc">{translate('.notifications.checkout-reminders-desc')}</p>
              </div>
              <button
                className={`status-badge ${notifications.checkoutReminders ? 'on' : 'off'}`}
                onClick={() => toggleNotification('checkoutReminders')}
              >
                {notifications.checkoutReminders ? translate('.on') : translate('.off')}
              </button>
            </div>

            <div className="notification-item">
              <div>
                <p className="notification-title">{translate('.notifications.monthly-reports')}</p>
                <p className="notification-desc">{translate('.notifications.monthly-reports-desc')}</p>
              </div>
              <button
                className={`status-badge ${notifications.monthlyReports ? 'on' : 'off'}`}
                onClick={() => toggleNotification('monthlyReports')}
              >
                {notifications.monthlyReports ? translate('.on') : translate('.off')}
              </button>
            </div>

            <div className="notification-item">
              <div>
                <p className="notification-title">{translate('.notifications.card-recommendations')}</p>
                <p className="notification-desc">{translate('.notifications.card-recommendations-desc')}</p>
              </div>
              <button
                className={`status-badge ${notifications.newCardSuggestions ? 'on' : 'off'}`}
                onClick={() => toggleNotification('newCardSuggestions')}
              >
                {notifications.newCardSuggestions ? translate('.on') : translate('.off')}
              </button>
            </div>

            <div className="notification-item">
              <div>
                <p className="notification-title">{translate('.notifications.reward-alerts')}</p>
                <p className="notification-desc">{translate('.notifications.reward-alerts-desc')}</p>
              </div>
              <button
                className={`status-badge ${notifications.rewardAlerts ? 'on' : 'off'}`}
                onClick={() => toggleNotification('rewardAlerts')}
              >
                {notifications.rewardAlerts ? translate('.on') : translate('.off')}
              </button>
            </div>

            <div className="notification-item">
              <div>
                <p className="notification-title">{translate('.notifications.new-card-releases')}</p>
                <p className="notification-desc">{translate('.notifications.new-card-releases-desc')}</p>
              </div>
              <button
                className={`status-badge ${notifications.newCardReleases ? 'on' : 'off'}`}
                onClick={() => toggleNotification('newCardReleases')}
              >
                {notifications.newCardReleases ? translate('.on') : translate('.off')}
              </button>
            </div>

          </div>
        </div>

        {/* Right — Spending Limits */}
        <div className="spending-limits-card">
          <h4 className="section-heading">

            {translate('.spending-limits.title')}
          </h4>
          <p className="profile-subtitle">{translate('.spending-limits.subtitle')}</p>

          <div className="limits-list">

            {/* Daily */}
            <div className="limit-item">
              <div className="limit-row">
                <label className="limit-label">{translate('.spending-limits.daily')}</label>
                <button
                  className={`status-badge ${spendingLimits.dailyEnabled ? 'on' : 'off'}`}
                  onClick={() => handleLimitChange('dailyEnabled', !spendingLimits.dailyEnabled)}
                >
                  {spendingLimits.dailyEnabled ? translate('.on') : translate('.off')}
                </button>
              </div>
              {spendingLimits.dailyEnabled && (
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
              )}
            </div>

            {/* Weekly */}
            <div className="limit-item">
              <div className="limit-row">
                <label className="limit-label">{translate('.spending-limits.weekly')}</label>
                <button
                  className={`status-badge ${spendingLimits.weeklyEnabled ? 'on' : 'off'}`}
                  onClick={() => handleLimitChange('weeklyEnabled', !spendingLimits.weeklyEnabled)}
                >
                  {spendingLimits.weeklyEnabled ? translate('.on') : translate('.off')}
                </button>
              </div>
              {spendingLimits.weeklyEnabled && (
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
              )}
            </div>

            {/* Monthly */}
            <div className="limit-item">
              <div className="limit-row">
                <label className="limit-label">{translate('.spending-limits.monthly')}</label>
                <button
                  className={`status-badge ${spendingLimits.monthlyEnabled ? 'on' : 'off'}`}
                  onClick={() => handleLimitChange('monthlyEnabled', !spendingLimits.monthlyEnabled)}
                >
                  {spendingLimits.monthlyEnabled ? translate('.on') : translate('.off')}
                </button>
              </div>
              {spendingLimits.monthlyEnabled && (
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
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Bottom — Delete button */}
      <div className="actions-card">
        <h4 className="section-heading">{translate('.actions.title')}</h4>
        <button className="signout-btn" onClick={handleClearData}>

          {translate('.actions.clear')}
        </button>
        <p className="signout-note">{translate('.actions.clear-note')}</p>
      </div>

    </div>
  );
}