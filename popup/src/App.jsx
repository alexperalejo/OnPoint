import React, { useEffect, useState } from 'react'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [detection, setDetection] = useState(null)
  const [error, setError] = useState(null)
  const [loadedFrom, setLoadedFrom] = useState('')
  // threshold fixed at 0.7 (guaranteed, not adjustable)
  const FIXED_THRESHOLD = 0.7

  useEffect(() => {
    // record where the popup was loaded from (helpful to verify we are using dist/popup.html)
    try { setLoadedFrom(window.location.href || '') } catch (e) { setLoadedFrom('') }

    async function queryContent() {
      try {
        const tabs = await new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, resolve))
        if (!tabs || !tabs[0]) {
          setError('No active tab found')
          setLoading(false)
          return
        }
        const tabId = tabs[0].id
        const sendReq = () => new Promise((resolve) => chrome.tabs.sendMessage(tabId, { type: 'getDetection' }, resolve))

        const trySend = async (attemptsLeft = 1) => {
          const resp = await sendReq()
          if (chrome.runtime.lastError) {
            // If we still have attempts, try to inject the content scripts and retry
            if (attemptsLeft > 0 && chrome.scripting) {
              try {
                await new Promise((res, rej) => {
                  chrome.scripting.executeScript({ target: { tabId }, files: ['content/detect-core.js', 'content/detect.js'] }, (injectionResults) => {
                    if (chrome.runtime.lastError) return rej(chrome.runtime.lastError)
                    res(injectionResults)
                  })
                })
                // small delay to let script initialize
                await new Promise(r => setTimeout(r, 150))
                return trySend(attemptsLeft - 1)
              } catch (injErr) {
                setError('Unable to inject content script: ' + String(injErr))
                setLoading(false)
                return null
              }
            }
            setError('Content script not available on this page')
            setLoading(false)
            return null
          }
          return resp
        }

        const resp = await trySend(1)
        if (resp && resp.ok) {
          setDetection(resp.detection)
        } else if (resp === null) {
          // error already set
        } else {
          setError('No response from content script')
        }
        setLoading(false)
      } catch (e) {
        setError(String(e))
        setLoading(false)
      }
    }
    queryContent()
  }, [])

  // no dynamic threshold: fixed at 0.7 per user request

  return (
    <div className="app">
      <div style={{fontSize: 12, color: '#666', marginBottom: 6}}>Loaded from: {loadedFrom}</div>
      <h1>Checkout Detector</h1>
      {loading && <p>Detecting...</p>}
      {error && <p className="error">{error}</p>}
        {detection && (
        <div className="result">
          <p>Is checkout (detector): <strong>{detection.isCheckout ? 'Yes' : 'No'}</strong></p>
          <p>Score: {detection.score}</p>
          <p>Reasons:</p>
          <ul>
            {detection.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      <div style={{marginTop: '8px'}}>
        <button onClick={() => location.reload()}>Refresh</button>
        {' '}
        <button onClick={() => {
          if (!detection) return;
          try {
            const text = JSON.stringify(detection, null, 2);
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text);
            } else {
              // fallback: open a prompt to copy
              window.prompt('Copy detection JSON', text);
            }
          } catch (e) {
            window.alert('Unable to copy detection result')
          }
        }}>Copy detection JSON</button>
      </div>

      <div style={{marginTop: '12px'}}>
        <label style={{fontSize: '13px'}}>Detection threshold: <strong>{FIXED_THRESHOLD.toFixed(2)}</strong></label>
        {detection && (
          <div style={{marginTop:8}}>
            <div>Passes score threshold (&gt;= {FIXED_THRESHOLD.toFixed(2)}): <strong>{detection.isCheckoutByScore ? 'Yes' : 'No'}</strong></div>
            <div>Accepted after post-check rules: <strong>{detection.isCheckout ? 'Yes' : 'No'}</strong></div>
            <div style={{fontSize:11, color:'#666'}}>
              Note: detector may accept pages with strong payment signals even if the raw score is slightly below the threshold. <br/>
              Payment signal present: <strong>{detection.hasPaymentSignal ? 'Yes' : 'No'}</strong>
            </div>
          </div>
        )}
      </div>

      <footer style={{marginTop: '12px', fontSize: '12px'}}>
        <div>Local-only detection · Manifest V3</div>
      </footer>
    </div>
  )
}
