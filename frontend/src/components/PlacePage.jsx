import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { API } from "../services/api"; // Need to export API or add a specific function
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ArrowRight,
  Info,
  Layers
} from "lucide-react";
import "./HomePage.css"; // Reuse some home styles

export default function PlacePage() {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaceData = async () => {
      try {
        const [provRes, servRes] = await Promise.all([
          API.get(`/services/provider/${id}`),
          API.get(`/services/provider/${id}/services`)
        ]);
        setProvider(provRes.data.data);
        setServices(servRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaceData();
  }, [id]);

  if (loading) return <div className="loading">Loading Place...</div>;
  if (!provider) return <div className="error">Provider not found</div>;

  return (
    <div className="homepage-container" style={{paddingTop: '80px'}}>
      <div className="hero-section" style={{minHeight: 'auto', padding: '40px 20px'}}>
          <h1 className="hero-title">{provider.businessName}</h1>
          <div style={{display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '10px', color: '#cbd5e1'}}>
            <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}><MapPin size={16}/> {provider.address}</span>
            <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}><Phone size={16}/> {provider.phone}</span>
          </div>
      </div>

      <div className="trending-section">
        <div className="section-header">
          <h2 className="section-title">Available Services at this Place</h2>
        </div>
        
        <div className="services-grid">
          {services.map((service) => (
            <div key={service._id} className="service-card">
              <div className="service-content">
                <h3 className="service-name">{service.serviceName}</h3>
                <p className="service-desc">{service.description}</p>
                <div className="service-meta">
                  <span className="meta-item"><Clock size={14} /> {service.avgServiceTime} mins</span>
                </div>
                <Link to={`/service-details/${service._id}`} className="btn-join">
                  View Details <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
