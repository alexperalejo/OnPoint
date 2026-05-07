/* global chrome */
import { useEffect, useState } from 'react';
import { useChromeStorageSync } from 'use-chrome-storage';
import { useDarkMode } from '../hooks/useDarkMode';
import './UserProfile.css';

export default function UserProfile({ onSignOut }) {
  useDarkMode();
  const [cardinfo] = useChromeStorageSync('cardinfo', []);
  const cardsCount = Array.isArray(cardinfo) ? cardinfo.length : 0;
  const [spendingLimits, setSpendingLimits] = useState({
    daily: '',
    dailyEnabled: false,
    weekly: '',
    weeklyEnabled: false,
    monthly: '',
    monthlyEnabled: false,
  });

  useEffect(() => {
    chrome.storage.local.get(['spendingLimits'], (data) => {
      if (data?.spendingLimits && typeof data.spendingLimits === 'object') {
        setSpendingLimits((prev) => ({ ...prev, ...data.spendingLimits }));
      }
    });
  }, []);

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
        <h2 className="profile-title">Settings</h2>
        <p className="profile-subtitle">Manage your wallet summary, spending guardrails, and account data.</p>
      </div>

      <div className="profile-info-card">
        <div className="stats-grid">
          <div className="stat-item blue">
            <p className="stat-label">Cards in Wallet</p>
            <p className="stat-value">{cardsCount}</p>
          </div>
        </div>
      </div>

      <div className="settings-main-grid">
        <div className="spending-limits-card">
          <h4 className="section-heading">Spending Limits</h4>
          <p className="profile-subtitle">Set optional limits to track spending in real time.</p>

          <div className="limits-list">
            <div className="limit-item">
              <div className="limit-row">
                <label className="limit-label">Daily</label>
                <button
                  className={`status-badge ${spendingLimits.dailyEnabled ? 'on' : 'off'}`}
                  onClick={() => handleLimitChange('dailyEnabled', !spendingLimits.dailyEnabled)}
                >
                  {spendingLimits.dailyEnabled ? 'On' : 'Off'}
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

            <div className="limit-item">
              <div className="limit-row">
                <label className="limit-label">Weekly</label>
                <button
                  className={`status-badge ${spendingLimits.weeklyEnabled ? 'on' : 'off'}`}
                  onClick={() => handleLimitChange('weeklyEnabled', !spendingLimits.weeklyEnabled)}
                >
                  {spendingLimits.weeklyEnabled ? 'On' : 'Off'}
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

            <div className="limit-item">
              <div className="limit-row">
                <label className="limit-label">Monthly</label>
                <button
                  className={`status-badge ${spendingLimits.monthlyEnabled ? 'on' : 'off'}`}
                  onClick={() => handleLimitChange('monthlyEnabled', !spendingLimits.monthlyEnabled)}
                >
                  {spendingLimits.monthlyEnabled ? 'On' : 'Off'}
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

        <div className="actions-card danger-zone">
          <h4 className="section-heading">Account Actions</h4>
          <p className="profile-subtitle">Clear local extension data and reset onboarding state.</p>
          <button className="signout-btn" onClick={handleClearData}>
            Delete / Clear All Information
          </button>
          <p className="signout-note">This action permanently clears your wallet, savings snapshots, and preferences.</p>
        </div>
      </div>

    </div>
  );
}