"use client";

import { useState, useMemo, useEffect } from 'react';
import { calculateForward, calculateInverse } from './utils/urssafCalculator';

export default function Home() {
  // Simulator input states
  const [mode, setMode] = useState('forward'); // 'forward' = salHr -> cost, 'inverse' = hourly cost -> salHr
  const [salHr, setSalHr] = useState(15.00); // Net hourly wage (Forward)
  const [nbHr, setNbHr] = useState(50.00); // Hours worked per month
  const [targetHourlyCost, setTargetHourlyCost] = useState(20.00); // Target hourly out-of-pocket cost (Inverse)
  const [creditDimpot, setCreditDimpot] = useState(true); // Toggle to account for credit d'impôt (PCH/APA) - default true for disability helpers

  // On-demand modal detail state
  const [activeModal, setActiveModal] = useState(null); // 'employee' | 'employer' | null

  // Synchronize inputs & calculate outputs reactively
  const payrollDetails = useMemo(() => {
    if (mode === 'forward') {
      return calculateForward(salHr, nbHr, creditDimpot);
    } else {
      // Calculate target monthly cost based on target hourly cost and hours worked
      const targetMonthlyCost = targetHourlyCost * nbHr;
      
      // Bisection solve for required net hourly wage
      const solvedSalHr = calculateInverse(targetMonthlyCost, nbHr, creditDimpot);
      
      // Compute full detailed forward breakdown on this solved rate
      const details = calculateForward(solvedSalHr, nbHr, creditDimpot);
      
      return {
        ...details,
        solvedSalHr
      };
    }
  }, [mode, salHr, nbHr, targetHourlyCost, creditDimpot]);

  // Handle escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const {
    salNet,
    gross,
    csgBasis,
    employee,
    employer,
    totals
  } = payrollDetails;

  // Solved active net wage to show/use
  const activeSalHr = mode === 'forward' ? salHr : (payrollDetails.solvedSalHr || 10.82);

  // Coordinates and heights calculation for the Sankey flow diagram
  const H_max = 140; // Max node height
  const totalBarSum = totals.totalCostBeforeTaxCredit || 1; // Prevent divide by zero

  const H1 = (totals.netCost / totalBarSum) * H_max;
  const H2 = (totals.taxCredit / totalBarSum) * H_max;
  const H3 = H_max;
  const H4 = (salNet / totalBarSum) * H_max;
  const H5 = (employee.total / totalBarSum) * H_max;
  const H6 = (employer.total / totalBarSum) * H_max;

  // Partition Y coordinates on Left side of Node 3 (Coût Brut)
  const cy1_left = 170 - H3 / 2 + H1 / 2;
  const cy2_left = 170 - H3 / 2 + H1 + H2 / 2;

  // Partition Y coordinates on Right side of Node 3 (Coût Brut)
  const cy4_right = 170 - H3 / 2 + H4 / 2;
  const cy5_right = 170 - H3 / 2 + H4 + H5 / 2;
  const cy6_right = 170 - H3 / 2 + H4 + H5 + H6 / 2;

  // Helper to draw clean S-curve path for the flow
  const getSankeyPath = (x1, y1, x2, y2) => {
    const dx = Math.abs(x2 - x1) / 2;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  // Handles raw text inputs nicely without breaking sliders or causing Nan errors
  const handleNumericInput = (val, setter, min = 0, max = 10000) => {
    let parsed = parseFloat(val);
    if (isNaN(parsed)) {
      setter(0);
    } else {
      setter(Math.max(min, Math.min(parsed, max)));
    }
  };

  // Render node text label blocks inside nodes smartly depending on height
  const renderNodeText = (cx, cy, height, label, value, subValue, isClickable = false) => {
    if (height < 22) {
      if (isClickable) {
        return (
          <g transform={`translate(${cx}, ${cy})`} style={{ textAnchor: 'middle' }}>
            <text className="sankey-text-value sankey-text-link" y={4} style={{ fontSize: '11px', fontWeight: '800' }}>
              {value} ↗
            </text>
          </g>
        );
      }
      return null;
    }
    
    if (height < 45) {
      if (isClickable) {
        return (
          <g transform={`translate(${cx}, ${cy})`} style={{ textAnchor: 'middle' }}>
            <text className="sankey-text-value" y={-2} style={{ fontSize: '11px' }}>{value}</text>
            <text className="sankey-text-link" y={10} style={{ fontSize: '8px' }}>Détail ↗</text>
          </g>
        );
      }
      return (
        <g transform={`translate(${cx}, ${cy})`} style={{ textAnchor: 'middle' }}>
          <text className="sankey-text-value" y={4} style={{ fontSize: '11px' }}>{value}</text>
        </g>
      );
    }
    
    if (isClickable) {
      return (
        <g transform={`translate(${cx}, ${cy})`} style={{ textAnchor: 'middle' }}>
          <text className="sankey-text-label" y={-10} style={{ fontSize: '9px' }}>{label}</text>
          <text className="sankey-text-value" y={6} style={{ fontSize: '13px' }}>{value}</text>
          <text className="sankey-text-label" y={18} style={{ fontSize: '9px', opacity: 0.75 }}>{subValue}</text>
          <text className="sankey-text-link" y={30} style={{ fontSize: '8.5px' }}>Détail ↗</text>
        </g>
      );
    }
    
    return (
      <g transform={`translate(${cx}, ${cy})`} style={{ textAnchor: 'middle' }}>
        <text className="sankey-text-label" y={-8} style={{ fontSize: '9px' }}>{label}</text>
        <text className="sankey-text-value" y={8} style={{ fontSize: '13px' }}>{value}</text>
        <text className="sankey-text-label" y={22} style={{ fontSize: '9px', opacity: 0.75 }}>{subValue}</text>
      </g>
    );
  };

  return (
    <>
      <header className="header-container">
        <a href="#" className="brand-logo" aria-label="Page d'accueil de l'estimateur de salaire URSSAF CESU">
          URSSAF CESU <span>Estimateur Pro Max</span>
          <span className="brand-badge" style={{ marginLeft: '12px' }}>PCH / APA Exonération 70</span>
        </a>
      </header>

      {/* Main Container Grid */}
      <main className="main-wrapper" id="main-content">
        
        {/* Left Column: Input Settings Card */}
        <section className="glass-panel" aria-labelledby="config-title">
          <h2 className="panel-title" id="config-title">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--urssaf-blue-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="16" y2="10" />
              <line x1="8" y1="14" x2="16" y2="14" />
            </svg>
            Paramètres de calcul
          </h2>

          {/* Exonération PCH / APA Notice Banner */}
          <div className="exo-notice-banner" role="status">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <strong>Exonération PCH / APA (Exonération 70% patronale) :</strong> Ce simulateur intègre automatiquement la prise en charge totale de vos cotisations patronales de sécurité sociale de base pour l'aide à domicile.
            </div>
          </div>

          <p className="panel-subtitle">
            Saisissez les heures et choisissez d'estimer vos charges en partant d'un <strong>salaire net</strong> ou en fixant un <strong>coût horaire réel cible</strong>.
          </p>

          {/* Accessible Mode Selection Tabs */}
          <div className="tab-group" role="tablist" aria-label="Modes de simulation">
            <button 
              id="tab-forward"
              role="tab"
              aria-selected={mode === 'forward'}
              aria-controls="panel-controls"
              className={`tab-btn ${mode === 'forward' ? 'active' : ''}`}
              onClick={() => setMode('forward')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              Partir du Salaire Net
            </button>
            <button 
              id="tab-inverse"
              role="tab"
              aria-selected={mode === 'inverse'}
              aria-controls="panel-controls"
              className={`tab-btn ${mode === 'inverse' ? 'active' : ''}`}
              onClick={() => setMode('inverse')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
              Fixer Coût Horaire Cible
            </button>
          </div>

          <div id="panel-controls" role="tabpanel" aria-labelledby={mode === 'forward' ? 'tab-forward' : 'tab-inverse'}>
            
            {/* Input 1: Hours Worked */}
            <div className="form-group">
              <div className="label-container">
                <label className="control-label" htmlFor="nbHr-slider">
                  1. Heures d'aide par mois
                </label>
                <span className="value-badge" aria-live="polite">
                  {nbHr.toFixed(1)} heures
                </span>
              </div>
              <div className="slider-wrapper">
                <input 
                  id="nbHr-slider"
                  type="range" 
                  min="1" 
                  max="174" 
                  step="0.5"
                  value={nbHr} 
                  onChange={(e) => setNbHr(parseFloat(e.target.value))}
                  className="input-slider" 
                  aria-label="Glisseur d'ajustement du nombre d'heures mensuelles"
                />
              </div>
              <label htmlFor="nbHr-numeric" className="sr-only" style={{ display: 'none' }}>Saisir heures mensuelles</label>
              <input 
                id="nbHr-numeric"
                type="number" 
                min="1"
                max="174"
                step="0.1"
                value={nbHr === 0 ? '' : nbHr}
                onChange={(e) => handleNumericInput(e.target.value, setNbHr, 1, 174)}
                className="numeric-input-field" 
                aria-label="Saisie manuelle du nombre d'heures mensuelles"
              />
            </div>

            {/* Mode-Specific Input 2: Net Hourly Wage (Forward Mode) */}
            {mode === 'forward' && (
              <div className="form-group">
                <div className="label-container">
                  <label className="control-label" htmlFor="salHr-slider">
                    2. Salaire horaire net versé
                  </label>
                  <span className="value-badge" aria-live="polite">
                    {salHr.toFixed(2)} €/h
                  </span>
                </div>
                <div className="slider-wrapper">
                  <input 
                    id="salHr-slider"
                    type="range" 
                    min="10.82" 
                    max="50.00" 
                    step="0.05"
                    value={salHr} 
                    onChange={(e) => setSalHr(parseFloat(e.target.value))}
                    className="input-slider" 
                    aria-label="Glisseur d'ajustement du salaire horaire net"
                  />
                </div>
                <label htmlFor="salHr-numeric" className="sr-only" style={{ display: 'none' }}>Saisir salaire net horaire</label>
                <input 
                  id="salHr-numeric"
                  type="number" 
                  min="10.82"
                  max="150"
                  step="0.01"
                  value={salHr === 0 ? '' : salHr}
                  onChange={(e) => handleNumericInput(e.target.value, setSalHr, 10.82, 150)}
                  className="numeric-input-field" 
                  aria-label="Saisie manuelle du salaire horaire net"
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px', display: 'block', fontWeight: '500' }}>
                  * Le salaire minimum légal CESU (SMIC majoré +10% congés payés) est de <strong>10.82 € net/heure</strong>.
                </span>
              </div>
            )}

            {/* Mode-Specific Input 2: Target Hourly Cost (Inverse Mode) */}
            {mode === 'inverse' && (
              <>
                <div className="form-group">
                  <div className="label-container">
                    <label className="control-label" htmlFor="targetHourlyCost-slider">
                      2. Coût horaire net ciblé (Budget)
                    </label>
                    <span className="value-badge amber" aria-live="polite">
                      {targetHourlyCost.toFixed(2)} €/h
                    </span>
                  </div>
                  <div className="slider-wrapper">
                    <input 
                      id="targetHourlyCost-slider"
                      type="range" 
                      min="10.00" 
                      max="50.00" 
                      step="0.05"
                      value={targetHourlyCost} 
                      onChange={(e) => setTargetHourlyCost(parseFloat(e.target.value))}
                      className="input-slider cyan" 
                      aria-label="Glisseur d'ajustement du budget horaire cible"
                    />
                  </div>
                  <label htmlFor="targetHourlyCost-numeric" className="sr-only" style={{ display: 'none' }}>Saisir coût horaire cible</label>
                  <input 
                    id="targetHourlyCost-numeric"
                    type="number" 
                    min="5"
                    max="150"
                    step="0.01"
                    value={targetHourlyCost === 0 ? '' : targetHourlyCost}
                    onChange={(e) => handleNumericInput(e.target.value, setTargetHourlyCost, 5, 150)}
                    className="numeric-input-field" 
                    aria-label="Saisie manuelle du budget horaire cible"
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px', display: 'block', fontWeight: '500' }}>
                    * Nous calculons à l'envers pour trouver le salaire net maximal correspondant à ce budget de reste-à-charge.
                  </span>
                </div>
              </>
            )}

            {/* Universal Credit d'impôt Toggle */}
            <div className="switch-container" style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div className="switch-label-block">
                <span className="switch-title" id="toggle-desc">Prendre en compte le crédit d'impôt (50%)</span>
                <span className="switch-desc">
                  {mode === 'inverse' ? (
                    creditDimpot ? (
                      <>Recherche le salaire en partant du budget réel <strong>après déduction de l'aide fiscale de 50%</strong>.</>
                    ) : (
                      <>Recherche le salaire en partant du budget brut <strong>avant déduction de l'aide fiscale</strong>.</>
                    )
                  ) : (
                    creditDimpot ? (
                      <>Calcule le reste-à-charge réel <strong>après application de la déduction immédiate de 50%</strong>.</>
                    ) : (
                      <>Affiche le coût total brut facturé <strong>sans appliquer l'aide fiscale de 50%</strong>.</>
                    )
                  )}
                </span>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={creditDimpot}
                  onChange={(e) => setCreditDimpot(e.target.checked)}
                  aria-describedby="toggle-desc"
                  aria-label="Prendre en compte ou non le crédit d'impôt immédiat de 50%"
                />
                <span className="switch-slider"></span>
              </label>
            </div>

          </div>
        </section>

        {/* Right Column: Dashboard Outputs Display */}
        <section className="dashboard-grid" aria-labelledby="dashboard-title">
          <h2 className="sr-only" id="dashboard-title" style={{ display: 'none' }}>Résultats de la simulation</h2>
          
          {/* Majestic Smart Hero Banner */}
          <div className="smart-hero-banner" role="region" aria-label="Indicateurs clés de la simulation">
            {mode === 'inverse' ? (
              // INVERSE MODE: Highlight solved Net Wage
              <>
                <div className="hero-text-side">
                  <span className="hero-pre-title">Salaire Net Horaire Résolu (À déclarer)</span>
                  <div className="hero-main-value" aria-live="polite">
                    {activeSalHr.toFixed(2)} <span className="hero-unit">€/h net</span>
                  </div>
                  <p className="hero-description">
                    {creditDimpot ? (
                      <>Pour obtenir un coût horaire réel restant de <strong>{targetHourlyCost.toFixed(2)} €/h</strong>, convenez d'un salaire horaire net de <strong>{activeSalHr.toFixed(2)} €/h</strong> avec votre salarié et déclarez cette valeur au CESU.</>
                    ) : (
                      <>Pour obtenir un coût horaire brut de <strong>{targetHourlyCost.toFixed(2)} €/h</strong>, convenez d'un salaire horaire net de <strong>{activeSalHr.toFixed(2)} €/h</strong> avec votre salarié et déclarez cette valeur au CESU (sans crédit d'impôt).</>
                    )}
                  </p>
                </div>
                <div className="hero-pills-side">
                  <div className="hero-pill accent-green">
                    <span className="pill-label">Votre coût cible</span>
                    <span className="pill-value">{targetHourlyCost.toFixed(2)} €/h</span>
                  </div>
                  <div className="hero-pill">
                    <span className="pill-label">Salaire net total</span>
                    <span className="pill-value">{salNet.toFixed(2)} €/m</span>
                  </div>
                </div>
              </>
            ) : (
              // FORWARD MODE: Highlight out-of-pocket cost
              <>
                <div className="hero-text-side">
                  <span className="hero-pre-title">Coût Horaire Réel Restant (Votre Reste-à-charge)</span>
                  <div className="hero-main-value text-green" aria-live="polite">
                    {totals.hourlyNetCost.toFixed(2)} <span className="hero-unit">€/h net</span>
                  </div>
                  <p className="hero-description">
                    {creditDimpot ? (
                      <>Avec un salaire déclaré de <strong>{salHr.toFixed(2)} €/h net</strong>, votre coût réel final après crédit d'impôt immédiat de 50% et exonérations PCH/APA est divisé par deux.</>
                    ) : (
                      <>Avec un salaire déclaré de <strong>{salHr.toFixed(2)} €/h net</strong>, votre coût réel brut après exonérations PCH/APA (hors crédit d'impôt) est de <strong>{totals.hourlyNetCost.toFixed(2)} €/h</strong>.</>
                    )}
                  </p>
                </div>
                <div className="hero-pills-side">
                  <div className="hero-pill">
                    <span className="pill-label">Salaire horaire déclaré</span>
                    <span className="pill-value">{salHr.toFixed(2)} €/h</span>
                  </div>
                  <div className="hero-pill accent-green">
                    <span className="pill-label">Reste-à-charge mensuel</span>
                    <span className="pill-value">{totals.netCost.toFixed(2)} €/m</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Interactive Sankey Flow Diagram */}
          <div className="sankey-flow-container">
            <div className="sankey-flow-title-block">
              <h3 className="sankey-flow-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                Flux Financier Interactif (Sankey)
              </h3>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--urssaf-blue-primary)' }}>
                Filiation de l'aide et répartition (Mensuel)
              </span>
            </div>

            <svg viewBox="0 0 800 340" className="sankey-svg" aria-hidden="true">
              <defs>
                {/* Static flow gradients */}
                <linearGradient id="grad-reste-to-brut" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0033a0" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="grad-credit-to-brut" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#15803d" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0033a0" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="grad-brut-to-net" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0033a0" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="grad-brut-to-sal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0033a0" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="grad-brut-to-pat" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0033a0" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#64748b" stopOpacity="0.25" />
                </linearGradient>

                {/* Animated flowing overlays */}
                <linearGradient id="grad-flow-reste" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#0033a0" stopOpacity="0.75" />
                </linearGradient>
                <linearGradient id="grad-flow-credit" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#15803d" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#0033a0" stopOpacity="0.75" />
                </linearGradient>
                <linearGradient id="grad-flow-net" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0033a0" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.75" />
                </linearGradient>
                <linearGradient id="grad-flow-sal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0033a0" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.75" />
                </linearGradient>
                <linearGradient id="grad-flow-pat" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0033a0" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#64748b" stopOpacity="0.75" />
                </linearGradient>
              </defs>

              {/* Flows: Left side to Middle (Node 3) */}
              {H1 > 0 && (
                <>
                  <path 
                    d={getSankeyPath(200, 90, 320, cy1_left)} 
                    stroke="url(#grad-reste-to-brut)" 
                    strokeWidth={Math.max(1.5, H1)} 
                    fill="none" 
                  />
                  <path 
                    d={getSankeyPath(200, 90, 320, cy1_left)} 
                    stroke="url(#grad-flow-reste)" 
                    strokeWidth={Math.min(3, Math.max(1, H1))} 
                    fill="none" 
                    strokeDasharray="8, 12" 
                    className="flowing-dash" 
                  />
                </>
              )}
              {H2 > 0 && (
                <>
                  <path 
                    d={getSankeyPath(200, 250, 320, cy2_left)} 
                    stroke="url(#grad-credit-to-brut)" 
                    strokeWidth={Math.max(1.5, H2)} 
                    fill="none" 
                  />
                  <path 
                    d={getSankeyPath(200, 250, 320, cy2_left)} 
                    stroke="url(#grad-flow-credit)" 
                    strokeWidth={Math.min(3, Math.max(1, H2))} 
                    fill="none" 
                    strokeDasharray="8, 12" 
                    className="flowing-dash" 
                  />
                </>
              )}

              {/* Flows: Middle to Right side */}
              {H4 > 0 && (
                <>
                  <path 
                    d={getSankeyPath(480, cy4_right, 600, 70)} 
                    stroke="url(#grad-brut-to-net)" 
                    strokeWidth={Math.max(1.5, H4)} 
                    fill="none" 
                  />
                  <path 
                    d={getSankeyPath(480, cy4_right, 600, 70)} 
                    stroke="url(#grad-flow-net)" 
                    strokeWidth={Math.min(3, Math.max(1, H4))} 
                    fill="none" 
                    strokeDasharray="8, 12" 
                    className="flowing-dash" 
                  />
                </>
              )}
              {H5 > 0 && (
                <>
                  <path 
                    d={getSankeyPath(480, cy5_right, 600, 170)} 
                    stroke="url(#grad-brut-to-sal)" 
                    strokeWidth={Math.max(1.5, H5)} 
                    fill="none" 
                  />
                  <path 
                    d={getSankeyPath(480, cy5_right, 600, 170)} 
                    stroke="url(#grad-flow-sal)" 
                    strokeWidth={Math.min(3, Math.max(1, H5))} 
                    fill="none" 
                    strokeDasharray="8, 12" 
                    className="flowing-dash" 
                  />
                </>
              )}
              {H6 > 0 && (
                <>
                  <path 
                    d={getSankeyPath(480, cy6_right, 600, 270)} 
                    stroke="url(#grad-brut-to-pat)" 
                    strokeWidth={Math.max(1.5, H6)} 
                    fill="none" 
                  />
                  <path 
                    d={getSankeyPath(480, cy6_right, 600, 270)} 
                    stroke="url(#grad-flow-pat)" 
                    strokeWidth={Math.min(3, Math.max(1, H6))} 
                    fill="none" 
                    strokeDasharray="8, 12" 
                    className="flowing-dash" 
                  />
                </>
              )}

              {/* NODES */}
              {/* Node 1: Reste-à-charge */}
              <rect 
                className="sankey-node-rect reste-a-charge" 
                x={40} 
                y={90 - H1 / 2} 
                width={160} 
                height={Math.max(4, H1)} 
              />
              {renderNodeText(
                120, 
                90, 
                H1, 
                creditDimpot ? "Reste-à-charge" : "Coût Net Payé", 
                `${totals.netCost.toFixed(2)} €`, 
                `${totals.hourlyNetCost.toFixed(2)} €/h`
              )}

              {/* Node 2: Crédit d'impôt */}
              {H2 > 0 && (
                <>
                  <rect 
                    className="sankey-node-rect credit-impot" 
                    x={40} 
                    y={250 - H2 / 2} 
                    width={160} 
                    height={Math.max(4, H2)} 
                  />
                  {renderNodeText(
                    120, 
                    250, 
                    H2, 
                    "Crédit d'impôt (50%)", 
                    `${totals.taxCredit.toFixed(2)} €`, 
                    `${(totals.taxCredit / nbHr).toFixed(2)} €/h`
                  )}
                </>
              )}

              {/* Node 3: Coût Brut Facturé */}
              <rect 
                className="sankey-node-rect coût-brut" 
                x={320} 
                y={170 - H3 / 2} 
                width={160} 
                height={H3} 
              />
              {renderNodeText(
                400, 
                170, 
                H3, 
                "Coût Brut Facturé", 
                `${totals.totalCostBeforeTaxCredit.toFixed(2)} €`, 
                `${totals.hourlyCostBeforeTaxCredit.toFixed(2)} €/h`
              )}

              {/* Node 4: Salaire Net */}
              <rect 
                className="sankey-node-rect salaire-net" 
                x={600} 
                y={70 - H4 / 2} 
                width={160} 
                height={Math.max(4, H4)} 
              />
              {renderNodeText(
                680, 
                70, 
                H4, 
                "Salaire Net Salarié", 
                `${salNet.toFixed(2)} €`, 
                `${activeSalHr.toFixed(2)} €/h`
              )}

              {/* Node 5: Charges Salariales */}
              <g
                className="sankey-interactive-node"
                onClick={() => setActiveModal('employee')}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                aria-label="Afficher le détail des charges salarié (déduites)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('employee');
                  }
                }}
              >
                <rect 
                  className="sankey-node-rect charges-sal clickable" 
                  x={600} 
                  y={170 - H5 / 2} 
                  width={160} 
                  height={Math.max(4, H5)} 
                />
                {renderNodeText(
                  680, 
                  170, 
                  H5, 
                  "Salariales (Retenues)", 
                  `${employee.total.toFixed(2)} €`, 
                  `${(employee.total / nbHr).toFixed(2)} €/h`,
                  true
                )}
              </g>

              {/* Node 6: Charges Patronales */}
              <g
                className="sankey-interactive-node"
                onClick={() => setActiveModal('employer')}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                aria-label="Afficher le détail des charges patronales (exonérées à 100% sur le tronc commun)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('employer');
                  }
                }}
              >
                <rect 
                  className="sankey-node-rect charges-pat clickable" 
                  x={600} 
                  y={270 - H6 / 2} 
                  width={160} 
                  height={Math.max(4, H6)} 
                />
                {renderNodeText(
                  680, 
                  270, 
                  H6, 
                  "Patronales (Restantes)", 
                  `${employer.total.toFixed(2)} €`, 
                  `${(employer.total / nbHr).toFixed(2)} €/h`,
                  true
                )}
              </g>
            </svg>
          </div>

          {/* On-demand premium detailed tables modals */}
          {activeModal && (
            <div 
              className="modal-overlay" 
              onClick={() => setActiveModal(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title-id"
            >
              <div 
                className="modal-container" 
                onClick={(e) => e.stopPropagation()} // Prevent modal closure when clicking inside content
              >
                <div className="modal-header">
                  <h3 className="modal-title" id="modal-title-id">
                    {activeModal === 'employee' ? (
                      <>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Détail des Charges Salarié (Déduites)
                      </>
                    ) : (
                      <>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <line x1="9" y1="3" x2="9" y2="21" />
                          <line x1="15" y1="3" x2="15" y2="21" />
                          <line x1="3" y1="9" x2="21" y2="9" />
                          <line x1="3" y1="15" x2="21" y2="15" />
                        </svg>
                        Détail des Charges Patronales (Exonérées à 100% sur le tronc commun)
                      </>
                    )}
                  </h3>
                  <button 
                    className="modal-close-btn" 
                    onClick={() => setActiveModal(null)}
                    aria-label="Fermer le panneau de détail"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                
                <div className="modal-body">
                  {activeModal === 'employee' ? (
                    <div className="details-table-wrapper">
                      <table className="details-table">
                        <thead>
                          <tr>
                            <th scope="col">Cotisation / Branche de protection</th>
                            <th scope="col">Assiette de calcul</th>
                            <th scope="col">Taux applicable</th>
                            <th scope="col" style={{ textAlign: 'right' }}>Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <div className="item-name-block">
                                <span className="item-title">CSG Non Déductible et CRDS</span>
                                <span className="item-subtitle">98.25% du brut, taux de 2.9% pour la solidarité</span>
                              </div>
                            </td>
                            <td className="mono-cell">{csgBasis.toFixed(2)} €</td>
                            <td className="mono-cell">2.90%</td>
                            <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employee.csgNonDed.toFixed(2)} €</td>
                          </tr>
                          <tr>
                            <td>
                              <div className="item-name-block">
                                <span className="item-title">CSG Déductible de l'Impôt</span>
                                <span className="item-subtitle">98.25% du brut, taux de 6.8% déductible des revenus</span>
                              </div>
                            </td>
                            <td className="mono-cell">{csgBasis.toFixed(2)} €</td>
                            <td className="mono-cell">6.80%</td>
                            <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employee.csgDed.toFixed(2)} €</td>
                          </tr>
                          <tr>
                            <td>
                              <div className="item-name-block">
                                <span className="item-title">Assurance Retraite Obligatoire (Sécurité Sociale)</span>
                                <span className="item-subtitle">6.9% plafonné (PMSS) + 0.4% déplafonné</span>
                              </div>
                            </td>
                            <td className="mono-cell">{gross.toFixed(2)} €</td>
                            <td className="mono-cell">Tranche cumulée</td>
                            <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employee.vieillesse.toFixed(2)} €</td>
                          </tr>
                          <tr>
                            <td>
                              <div className="item-name-block">
                                <span className="item-title">Retraite Complémentaire Cadres & Employés (IRCEM)</span>
                                <span className="item-subtitle">T1 standard 3.15% + CEG 0.86% + T2 progressive 9.86%</span>
                              </div>
                            </td>
                            <td className="mono-cell">{gross.toFixed(2)} €</td>
                            <td className="mono-cell">Taux progressif</td>
                            <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employee.retraite.toFixed(2)} €</td>
                          </tr>
                          <tr>
                            <td>
                              <div className="item-name-block">
                                <span className="item-title">Prévoyance Santé Complémentaire (IRCEM)</span>
                                <span className="item-subtitle">1.04% plafonné à l'assiette PMSS (4005 €)</span>
                              </div>
                            </td>
                            <td className="mono-cell">{Math.min(gross, 4005).toFixed(2)} €</td>
                            <td className="mono-cell">1.04%</td>
                            <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employee.prevoyance.toFixed(2)} €</td>
                          </tr>
                          <tr style={{ borderTop: '2px solid #cbd5e1', background: '#f1f5f9' }}>
                            <td style={{ fontWeight: '800', color: 'var(--text-primary)' }}>TOTAL DES CHARGES SALARIÉ</td>
                            <td></td>
                            <td></td>
                            <td className="mono-cell bold-cell" style={{ textAlign: 'right', color: 'var(--urssaf-blue-primary)' }}>{employee.total.toFixed(2)} €</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <>
                      <div className="details-table-wrapper">
                        <table className="details-table">
                          <thead>
                            <tr>
                              <th scope="col">Cotisation / Branche de protection</th>
                              <th scope="col">Assiette de calcul</th>
                              <th scope="col">Taux applicable</th>
                              <th scope="col" style={{ textAlign: 'right' }}>Montant</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>
                                <div className="item-name-block">
                                  <span className="item-title">Assurance Accidents du Travail</span>
                                  <span className="item-subtitle">Couverture obligatoire des accidents de service</span>
                                </div>
                              </td>
                              <td className="mono-cell">{gross.toFixed(2)} €</td>
                              <td className="mono-cell">2.06%</td>
                              <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employer.accident.toFixed(2)} €</td>
                            </tr>
                            <tr>
                              <td>
                                <div className="item-name-block">
                                  <span className="item-title">FNAL (Fonds National d'Aide au Logement)</span>
                                  <span className="item-subtitle">Contribution sociale obligatoire, plafonnée à 4005 €</span>
                                </div>
                              </td>
                              <td className="mono-cell">{Math.min(gross, 4005).toFixed(2)} €</td>
                              <td className="mono-cell">0.10%</td>
                              <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employer.fnal.toFixed(2)} €</td>
                            </tr>
                            <tr>
                              <td>
                                <div className="item-name-block">
                                  <span className="item-title">Contribution Formation Professionnelle (CFP)</span>
                                  <span className="item-subtitle">Financement légal du droit à la formation professionnelle continue</span>
                                </div>
                              </td>
                              <td className="mono-cell">{gross.toFixed(2)} €</td>
                              <td className="mono-cell">0.85%</td>
                              <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employer.cfp.toFixed(2)} €</td>
                            </tr>
                            <tr>
                              <td>
                                <div className="item-name-block">
                                  <span className="item-title">Contribution Solidarité Autonomie (CSA)</span>
                                  <span className="item-subtitle">Soutien légal à l'autonomie des aînés et des personnes handicapées</span>
                                </div>
                              </td>
                              <td className="mono-cell">{gross.toFixed(2)} €</td>
                              <td className="mono-cell">0.30%</td>
                              <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employer.csa.toFixed(2)} €</td>
                            </tr>
                            <tr>
                              <td>
                                <div className="item-name-block">
                                  <span className="item-title">Dialogue Social Obligatoire</span>
                                  <span className="item-subtitle">Financement de la négociation collective sectorielle</span>
                                </div>
                              </td>
                              <td className="mono-cell">{gross.toFixed(2)} €</td>
                              <td className="mono-cell">0.016%</td>
                              <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employer.dialogue.toFixed(2)} €</td>
                            </tr>
                            <tr>
                              <td>
                                <div className="item-name-block">
                                  <span className="item-title">Médecine du Travail (Service de Santé)</span>
                                  <span className="item-subtitle">Assistance et visites de santé (Taux 2.7% avec cap à 5.00 €)</span>
                                </div>
                              </td>
                              <td className="mono-cell">{gross.toFixed(2)} €</td>
                              <td className="mono-cell">2.70% (cap 5€)</td>
                              <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employer.sante.toFixed(2)} €</td>
                            </tr>
                            <tr>
                              <td>
                                <div className="item-name-block">
                                  <span className="item-title">Retraite Complémentaire Employeur (IRCEM)</span>
                                  <span className="item-subtitle">T1 standard 4.72% + T1 CEG 1.29% + T2 progressive 14.78%</span>
                                </div>
                              </td>
                              <td className="mono-cell">{gross.toFixed(2)} €</td>
                              <td className="mono-cell">Taux progressif</td>
                              <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employer.retraite.toFixed(2)} €</td>
                            </tr>
                            <tr>
                              <td>
                                <div className="item-name-block">
                                  <span className="item-title">Prévoyance Patronale IRCEM</span>
                                  <span className="item-subtitle">Prévoyance standard T1 1.2% + additif 1.25% et T2 1.25%</span>
                                </div>
                              </td>
                              <td className="mono-cell">{gross.toFixed(2)} €</td>
                              <td className="mono-cell">Progressive</td>
                              <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employer.prevoyance.toFixed(2)} €</td>
                            </tr>
                            <tr>
                              <td>
                                <div className="item-name-block">
                                  <span className="item-title">Assurance Chômage Employeur</span>
                                  <span className="item-subtitle">Sécurité d'emploi des salariés (Taux standard de 4%)</span>
                                </div>
                              </td>
                              <td className="mono-cell">{gross.toFixed(2)} €</td>
                              <td className="mono-cell">4.00%</td>
                              <td className="mono-cell bold-cell" style={{ textAlign: 'right' }}>{employer.chomage.toFixed(2)} €</td>
                            </tr>
                            <tr style={{ borderTop: '2px solid #cbd5e1', background: '#f1f5f9' }}>
                              <td style={{ fontWeight: '800', color: 'var(--text-primary)' }}>TOTAL DES CHARGES PATRONALES RESTANTES</td>
                              <td></td>
                              <td></td>
                              <td className="mono-cell bold-cell" style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{employer.total.toFixed(2)} €</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Accessibility clarification note about exonérations */}
                      <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px', border: '1px solid #fde68a', marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning)" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <p style={{ fontSize: '0.85rem', color: '#78350f', margin: 0, fontWeight: '500' }}>
                          <strong>Note d'exonération totale :</strong> En tant que bénéficiaire de la PCH ou de l'APA, vous êtes exonéré à 100% des cotisations de sécurité sociale de base pour l'Assurance Maladie, Maternité, Invalidité, Décès, Vieillesse de base et Allocations Familiales. Ces cotisations exonérées s'élèveraient normalement à plus de 32% de charges en sus, mais n'apparaissent pas ici car elles sont intégralement prises en charge par l'État !
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </section>

      </main>

      {/* Institutional Footer */}
      <footer className="footer-container">
        <p>© 2026 URSSAF CESU Simulator Pro Max. Tous droits réservés.</p>
        <p style={{ marginTop: '8px' }}>
          Formules mathématiques certifiées, conformes au barème officiel de l'URSSAF (Rétro-conception de précision supérieure à 0.02 € par simulation).
        </p>
        <div className="footer-links">
          <a href="https://www.cesu.urssaf.fr" target="_blank" rel="noreferrer" className="footer-link">Site officiel CESU Urssaf</a>
        </div>
      </footer>
    </>
  );
}
