(function(){
  // Minimal recommendation UI listener: renders a small dismissible panel
  const ROOT_ID = 'onpoint-recommendation-root';

  function createPanel(recommendation, candidate) {
    try {
      removePanel();
      const root = document.createElement('div');
      root.id = ROOT_ID;
      root.style.position = 'fixed';
      root.style.right = '12px';
      root.style.bottom = '12px';
      root.style.zIndex = 2147483647;
      root.style.maxWidth = '360px';
      root.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
      root.style.borderRadius = '8px';
      root.style.fontFamily = 'Arial, sans-serif';
      root.style.background = '#fff';
      root.style.color = '#111';
      root.style.padding = '12px';
      root.style.border = '1px solid rgba(0,0,0,0.08)';

      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.style.marginBottom = '6px';
      title.textContent = 'Which card did you use?';
      root.appendChild(title);

      const sub = document.createElement('div');
      sub.style.fontSize = '13px';
      sub.style.marginBottom = '8px';
      sub.textContent = recommendation?.reason || `Estimated extra rewards: ${recommendation?.estimate || '—'}`;
      root.appendChild(sub);

      const list = document.createElement('div');
      list.style.maxHeight = '220px';
      list.style.overflowY = 'auto';
      list.style.marginBottom = '8px';
      root.appendChild(list);

      // placeholder while wallet loads
      const loading = document.createElement('div');
      loading.textContent = 'Loading cards...';
      loading.style.fontSize = '13px';
      loading.style.color = '#666';
      list.appendChild(loading);

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.justifyContent = 'flex-end';

      const confirm = document.createElement('button');
      confirm.textContent = 'Confirm';
      confirm.style.padding = '6px 10px';
      confirm.style.border = 'none';
      confirm.style.borderRadius = '6px';
      confirm.style.cursor = 'pointer';
      confirm.style.background = '#0066ff';
      confirm.style.color = '#fff';
      confirm.disabled = true;

      const skip = document.createElement('button');
      skip.textContent = 'Skip';
      skip.style.padding = '6px 10px';
      skip.style.border = '1px solid #ccc';
      skip.style.borderRadius = '6px';
      skip.style.cursor = 'pointer';

      actions.appendChild(skip);
      actions.appendChild(confirm);
      root.appendChild(actions);

      document.body.appendChild(root);

      // load wallet from storage and populate options
      function populate(cards) {
        list.innerHTML = '';
        const radios = [];
        // recommended option first
        const recId = 'rec_recommended';
        const recRow = document.createElement('label');
        recRow.style.display = 'block';
        recRow.style.padding = '6px';
        recRow.style.borderBottom = '1px solid #f0f0f0';
        const recInput = document.createElement('input');
        recInput.type = 'radio';
        recInput.name = 'onpoint_card';
        recInput.value = recId;
        recInput.checked = true;
        recInput.style.marginRight = '8px';
        recRow.appendChild(recInput);
        const recText = document.createElement('span');
        recText.textContent = recommendation?.cardName || 'Recommended card';
        recRow.appendChild(recText);
        list.appendChild(recRow);
        radios.push({ input: recInput, card: recommendation || null });

        if (Array.isArray(cards) && cards.length) {
          for (const c of cards) {
            const id = 'w_' + (c.id || Math.random().toString(16).slice(2));
            const row = document.createElement('label');
            row.style.display = 'block';
            row.style.padding = '6px';
            row.style.borderBottom = '1px solid #f8f8f8';
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'onpoint_card';
            input.value = id;
            input.style.marginRight = '8px';
            row.appendChild(input);
            const text = document.createElement('span');
            text.textContent = c.name || (c.brand ? c.brand + ' ****' + (c.last4 || '') : 'Card');
            row.appendChild(text);
            list.appendChild(row);
            radios.push({ input, card: c });
          }
        } else {
          const none = document.createElement('div');
          none.textContent = "No cards in wallet.";
          none.style.color = '#666';
          none.style.padding = '6px';
          list.appendChild(none);
        }

        // enable confirm when a selection is present
        function updateEnabled() { confirm.disabled = !radios.some(r => r.input.checked); }
        radios.forEach(r => r.input.addEventListener('change', updateEnabled));
        updateEnabled();

        // confirm handler
        confirm.onclick = () => {
          const sel = radios.find(r => r.input.checked);
          const selectedCard = sel ? sel.card : null;
          try { chrome.runtime.sendMessage({ type: 'recommendationConfirmed', candidate: candidate || null, selectedCard }); } catch (e) { }
          removePanel();
        };

        // skip handler
        skip.onclick = () => {
          try { chrome.runtime.sendMessage({ type: 'recommendationSkipped', candidate: candidate || null }); } catch (e) { }
          removePanel();
        };
      }

      // read wallet
      try {
        chrome.storage.local.get(['wallet'], (data) => {
          const cards = data?.wallet || [];
          populate(cards);
        });
      } catch (e) {
        // fail gracefully: populate empty
        populate([]);
      }
    } catch (e) { /* ignore DOM errors */ }
  }

  function removePanel() {
    try {
      const existing = document.getElementById(ROOT_ID);
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    } catch (e) { }
  }

  // Listen for background messages
  try {
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (!msg || !msg.type) return;
        if (msg.type === 'showRecommendation') {
          const rec = msg.recommendation || (msg.candidate && msg.candidate.recommendation) || null;
          // allow either backend-provided rec or a placeholder
          const payload = rec || { cardName: 'Suggested card', reason: 'We detected a linked purchase', estimate: msg.candidate?.checkout?.amount ? Math.round(msg.candidate.checkout.amount * 0.01) + ' ' + (msg.candidate.checkout.currency || '$') : null };
          createPanel(payload, msg.candidate || null);
        }
        if (msg.type === 'hideRecommendation') removePanel();
      });
    }
  } catch (e) { /* ignore */ }

  // expose for debug
  window.__onpointRecommendationUI = { show: createPanel, hide: removePanel };
})();
