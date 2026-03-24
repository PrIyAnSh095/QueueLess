import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAPI } from '../services/api';
import './SearchBar.css';

const SearchBar = ({ placeholder = 'Search services, organizations...' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults(null); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await searchAPI(value);
        setResults(res.data.data);
        setOpen(true);
      } catch { setResults(null); }
      finally { setLoading(false); }
    }, 300);
  };

  return (
    <div className="search-bar-wrap" ref={ref}>
      <div className="search-input-wrap">
        <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          className="search-input"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => { if (results) setOpen(true); }}
        />
        {loading && <div className="search-spinner" />}
      </div>
      {open && results && (
        <div className="search-dropdown">
          {results.services?.length > 0 && (
            <div className="search-group">
              <div className="search-group-label">Services</div>
              {results.services.map(s => (
                <div key={s._id} className="search-item" onClick={() => { setOpen(false); navigate(`/service-details/${s._id}`); }}>
                  <span className="search-item-name">{s.serviceName}</span>
                  <span className="search-item-sub">{s.organizationName}</span>
                </div>
              ))}
            </div>
          )}
          {results.organizations?.length > 0 && (
            <div className="search-group">
              <div className="search-group-label">Organizations</div>
              {results.organizations.map(o => (
                <div key={o._id} className="search-item" onClick={() => { setOpen(false); navigate(`/organizations/${o._id}`); }}>
                  <span className="search-item-name">{o.businessName}</span>
                  <span className="search-item-sub">{o.address || ''}</span>
                </div>
              ))}
            </div>
          )}
          {results.services?.length === 0 && results.organizations?.length === 0 && (
            <div className="search-empty">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
