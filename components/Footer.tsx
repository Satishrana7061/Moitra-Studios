import React from 'react';
import { Link } from 'react-router-dom';
import { STUDIO_INFO } from '../constants';
import './redesign/redesign.css';
import MoitraSeal from './redesign/MoitraSeal';

// The studio's footer: the two games, the pages the app stores ask for, and how to reach us.
const Footer: React.FC = () => (
  <footer className="st-foot">
    <div className="rd-wrap st-foot-in">
      <div className="st-foot-brand">
        <span className="st-foot-mark"><MoitraSeal size={52} label="" /><span className="st-word">MOITRA<small>STUDIOS</small></span></span>
        <p>Independent strategy games about how power works.</p>
        <span className="select-all">{STUDIO_INFO.email}</span>
      </div>
      <div className="st-foot-col">
        <h2>Games</h2>
        <Link to="/geopolitics">GeoPolitics</Link>
        <Link to="/rajneeti">Rajneeti</Link>
      </div>
      <div className="st-foot-col">
        <h2>Studio</h2>
        <Link to="/contact-us">Contact</Link>
        <Link to="/privacy-policy">Privacy Policy</Link>
        <Link to="/terms-of-service">Terms of Service</Link>
        <Link to="/geopolitics#player-information">Delete my data</Link>
      </div>
    </div>
    <div className="rd-wrap st-foot-bar">
      <span>© {new Date().getFullYear()} {STUDIO_INFO.name}. All rights reserved.</span>
      <span>Owned and operated by {STUDIO_INFO.legalName}</span>
    </div>
  </footer>
);

export default Footer;
