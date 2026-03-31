import React, { useState, useEffect, useRef } from 'react';
import { Clock as ClockIcon, Check } from 'lucide-react';
import './TimePicker.css';

const TimePicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('hours'); // 'hours' or 'minutes'
  const containerRef = useRef(null);

  const [hours, setHours] = useState('09');
  const [minutes, setMinutes] = useState('00');
  const [ampm, setAmpm] = useState('AM');

  useEffect(() => {
    if (value) {
      const [h24, m] = value.split(':');
      let hVal = parseInt(h24, 10);
      const ampmVal = hVal >= 12 ? 'PM' : 'AM';
      let h12 = hVal % 12;
      if (h12 === 0) h12 = 12;
      
      setHours(String(h12).padStart(2, '0'));
      setMinutes(m);
      setAmpm(ampmVal);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleSelectHour = (h) => {
    setHours(String(h).padStart(2, '0'));
    setMode('minutes');
  };

  const handleSelectMinute = (m) => {
    const formattedM = String(m).padStart(2, '0');
    setMinutes(formattedM);
    updateValue(hours, formattedM, ampm);
    setIsOpen(false);
    setMode('hours');
  };

  const handleSelectAmpm = (newAmpm) => {
    setAmpm(newAmpm);
    updateValue(hours, minutes, newAmpm);
  };

  const updateValue = (h12, m, ap) => {
    let h24 = parseInt(h12, 10);
    if (ap === 'PM' && h24 < 12) h24 += 12;
    if (ap === 'AM' && h24 === 12) h24 = 0;
    const formattedH24 = String(h24).padStart(2, '0');
    onChange(`${formattedH24}:${m}`);
  };

  const hoursArray = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutesArray = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const displayTime = `${hours}:${minutes} ${ampm}`;

  return (
    <div className="time-picker-container" ref={containerRef}>
      {label && <label className="tp-label">{label}</label>}
      <div className="tp-input-wrapper" onClick={toggleOpen}>
        <ClockIcon size={16} className="tp-icon" />
        <input 
          type="text" 
          readOnly 
          value={displayTime} 
          className="tp-input"
        />
      </div>

      {isOpen && (
        <div className="tp-dropdown">
          <div className="tp-header">
            <div className="tp-time-display">
              <span 
                className={`tp-unit ${mode === 'hours' ? 'active' : ''}`}
                onClick={() => setMode('hours')}
              >
                {hours}
              </span>
              <span className="tp-separator">:</span>
              <span 
                className={`tp-unit ${mode === 'minutes' ? 'active' : ''}`}
                onClick={() => setMode('minutes')}
              >
                {minutes}
              </span>
            </div>
            <div className="tp-ampm-toggle">
              <button 
                className={`tp-ampm-btn ${ampm === 'AM' ? 'active' : ''}`}
                onClick={() => handleSelectAmpm('AM')}
              >AM</button>
              <button 
                className={`tp-ampm-btn ${ampm === 'PM' ? 'active' : ''}`}
                onClick={() => handleSelectAmpm('PM')}
              >PM</button>
            </div>
          </div>

          <div className="tp-clock-face">
            {mode === 'hours' ? (
              <div className="tp-numbers">
                {hoursArray.map((h, i) => {
                  const angle = (i + 1) * 30 - 90;
                  const x = 50 + 40 * Math.cos((angle * Math.PI) / 180);
                  const y = 50 + 40 * Math.sin((angle * Math.PI) / 180);
                  return (
                    <button
                      key={h}
                      className={`tp-number ${Number(hours) === h ? 'selected' : ''}`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      onClick={() => handleSelectHour(h)}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="tp-numbers">
                {minutesArray.map((m, i) => {
                  const angle = i * 30 - 90;
                  const x = 50 + 40 * Math.cos((angle * Math.PI) / 180);
                  const y = 50 + 40 * Math.sin((angle * Math.PI) / 180);
                  return (
                    <button
                      key={m}
                      className={`tp-number ${Number(minutes) === m ? 'selected' : ''}`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      onClick={() => handleSelectMinute(m)}
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="tp-clock-center" />
            <div 
              className="tp-hand" 
              style={{ 
                '--rotation': `${mode === 'hours' ? (Number(hours) % 12) * 30 : Number(minutes) * 6}deg` 
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
