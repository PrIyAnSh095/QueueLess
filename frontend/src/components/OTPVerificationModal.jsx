import React, { useState, useRef, useEffect } from 'react';
import './OTPVerificationModal.css';

const OTPVerificationModal = ({ isOpen, onClose, onVerify, email, loading }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isOpening, setIsOpening] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      inputRefs.current[0].focus();
      setIsOpening(false);
      setOtp(['', '', '', '', '', '']);
    }
  }, [isOpen]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit if 6th digit reached
    if (value && index === 5) {
      const code = [...otp];
      code[5] = value.slice(-1);
      if (code.join('').length === 6) {
        setIsOpening(true);
        setTimeout(() => onVerify(code.join('')), 800);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    if (pasted.length === 6) {
       setIsOpening(true);
       setTimeout(() => onVerify(pasted), 800);
    } else {
       const next = Math.min(pasted.length, 5);
       inputRefs.current[next]?.focus();
    }
  };

  const handleSubmit = () => {
    const code = otp.join('');
    if (code.length === 6) {
      setIsOpening(true);
      setTimeout(() => onVerify(code), 800);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="otp-modal-overlay" onClick={onClose}>
      <div className={`otp-modal ${isOpening ? 'safe-opening' : ''}`} onClick={e => e.stopPropagation()}>
        <button className="otp-modal-close" onClick={onClose}>×</button>
        <div className="otp-modal-header">
          <div className="otp-modal-icon">🔐</div>
          <h2>Access Granted?</h2>
          <p>Enter the 6-digit vault key sent to <strong>{email || 'your email'}</strong></p>
        </div>
        <div className="otp-input-grid" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="otp-input-box"
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
            />
          ))}
        </div>
        <button
          className="otp-verify-btn"
          onClick={handleSubmit}
          disabled={otp.join('').length !== 6 || loading}
        >
          {loading ? 'Verifying...' : 'Verify & Confirm'}
        </button>
        <p className="otp-hint">Didn't receive the code? Check your spam folder or try again.</p>
      </div>
    </div>
  );
};

export default OTPVerificationModal;
