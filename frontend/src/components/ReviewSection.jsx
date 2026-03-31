import React, { useState, useEffect } from 'react';
import { getReviewsAPI, createReviewAPI } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import './ReviewSection.css';

const ReviewSection = ({ targetType, targetId }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [total, setTotal] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imageFiles, setImageFiles] = useState([]);

  const fetchReviews = async () => {
    try {
      const res = await getReviewsAPI(targetType, targetId);
      setReviews(res.data.data.reviews || []);
      setAvgRating(res.data.data.averageRating || 0);
      setTotal(res.data.data.totalReviews || 0);
    } catch {}
  };

  useEffect(() => { fetchReviews(); }, [targetType, targetId]);

  const handleSubmit = async () => {
    if (!rating) { setError('Please select a rating'); return; }
    try {
      setSubmitting(true);
      setError('');

      const formData = new FormData();
      formData.append('targetType', targetType);
      formData.append('targetId', targetId);
      formData.append('rating', rating);
      if (comment) formData.append('comment', comment);
      imageFiles.forEach((file) => formData.append('images', file));

      await createReviewAPI(formData);
      setRating(0); setComment(''); setImageFiles([]);
      fetchReviews();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="review-section">
      <div className="review-header">
        <h3>Reviews & Ratings</h3>
        <div className="review-summary">
          <span className="review-avg">{avgRating.toFixed(1)}</span>
          <div className="review-stars-display">
            {[1,2,3,4,5].map(s => (
              <span key={s} className={`star ${s <= Math.round(avgRating) ? 'filled' : ''}`}>★</span>
            ))}
          </div>
          <span className="review-count">({total} reviews)</span>
        </div>
      </div>

      {user && (
        <div className="review-form">
          <div className="review-stars-input">
            {[1,2,3,4,5].map(s => (
              <button
                key={s}
                className={`star-btn ${s <= (hoverRating || rating) ? 'active' : ''}`}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
              >★</button>
            ))}
          </div>
          <textarea
            className="review-textarea"
            placeholder="Write your review (optional)..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />
          <input
            type="file"
            accept="image/*"
            multiple
            className="review-image-input"
            onChange={e => setImageFiles(Array.from(e.target.files))}
          />
          {imageFiles.length > 0 && (
            <div className="review-image-preview-row">
              {imageFiles.map((file, idx) => (
                <div key={idx} className="review-image-preview">
                  <img src={URL.createObjectURL(file)} alt={`preview-${idx}`} />
                  <button type="button" onClick={() => setImageFiles(prev => prev.filter((_, j) => j !== idx))}>×</button>
                </div>
              ))}
            </div>
          )}
          {error && <div className="review-error">{error}</div>}
          <button className="review-submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      )}

      <div className="review-list">
        {reviews.length === 0 ? (
          <p className="review-empty">No reviews yet. Be the first!</p>
        ) : reviews.map(r => (
          <div key={r._id} className="review-item">
            <div className="review-item-header">
              <span className="review-author">{r.user?.name || 'User'}</span>
              <div className="review-item-stars">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className={`star-sm ${s <= r.rating ? 'filled' : ''}`}>★</span>
                ))}
              </div>
              <span className="review-date">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            {r.comment && <p className="review-text">{r.comment}</p>}
            {r.images?.length > 0 && (
              <div className="review-images-row">
                {r.images.map((img, idx) => (
                  <img key={idx} src={img.url || img} alt={`review-${idx}`} className="review-thumb" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewSection;
