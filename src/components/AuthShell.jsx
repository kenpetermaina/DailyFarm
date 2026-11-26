import { Milk, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AuthShell({ children, heroImages = [] }) {
  const [activeImage, setActiveImage] = useState(0);
  const isImageAuth = heroImages.length > 0;

  useEffect(() => {
    if (heroImages.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % heroImages.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [heroImages]);

  return (
    <div className="auth-page">
      <section className={`auth-aside ${heroImages.length ? 'auth-aside-with-image' : ''}`}>
        {heroImages.map((image, index) => (
          <img
            key={image.src}
            className={`auth-hero-image ${index === activeImage ? 'active' : ''}`}
            src={image.src}
            alt={image.alt}
            aria-hidden={index !== activeImage}
          />
        ))}
        <div className="brand auth-aside-brand">
          {isImageAuth ? (
            <img className="auth-logo-mark" src="/favicon.svg?v=2" alt="" />
          ) : (
            <div className="brand-mark"><Milk size={22} /></div>
          )}
          <div>
            <div className="brand-name">DairyFarm</div>
            {!isImageAuth && <div className="brand-sub">Manager</div>}
          </div>
        </div>
        <div className="auth-aside-copy">
          <h2>Every litre, counted.</h2>
          <p>{isImageAuth ? 'A clear record of every milking.' : 'Record milk at each milking, keep track of every cow and see how your farm is doing.'}</p>
          {!isImageAuth && (
            <ul className="auth-points">
              <li><CheckCircle2 size={18} /> Morning, lunch and evening records</li>
              <li><CheckCircle2 size={18} /> Daily, weekly and monthly reports</li>
              <li><CheckCircle2 size={18} /> Your farm's data is private to you</li>
            </ul>
          )}
        </div>
        <span className="brand-sub">© DairyFarm Manager</span>
      </section>
      <section className={`auth-main ${heroImages.length ? 'auth-main-with-image' : ''}`}>
        <div className="auth-card">
          <div className="auth-mobile-brand">
            {isImageAuth ? <img className="auth-logo-mark" src="/favicon.svg?v=2" alt="" /> : <div className="brand-mark"><Milk size={20} /></div>}
            {isImageAuth ? <span className="auth-login-brand-name">DairyFarm</span> : 'DairyFarm Manager'}
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
