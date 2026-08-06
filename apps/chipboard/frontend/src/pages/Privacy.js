// path/to/frontend/src/pages/Privacy.js

import React from 'react';
import './Privacy.css'; // Ensure you have the CSS file for styling

/**
 * Privacy Component
 * 
 * Displays the Privacy Policy of the application.
 */
function Privacy() {
  return (
    <div className="privacy-page">
      <h1>Privacy Policy</h1>
      <p>Effective Date: [Insert Date]</p>
      <h2>Introduction</h2>
      <p>
        Welcome to LaskoCreative ("we", "our", "us"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice or our practices with regard to your personal information, please contact us at LaskoCreative@gmail.com.
      </p>
      <h2>Information We Collect</h2>
      <p>
        We collect personal information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products and services, when you participate in activities on the website, or otherwise when you contact us.
      </p>
      <h2>How We Use Your Information</h2>
      <p>
        We use personal information collected via our website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
      </p>
      <h2>Sharing Your Information</h2>
      <p>
        We may process or share your data that we hold based on the following legal basis: Consent, Legitimate Interests, Performance of a Contract, Legal Obligations, and Vital Interests.
      </p>
      <h2>Security of Your Information</h2>
      <p>
        We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.
      </p>
      <h2>Your Privacy Rights</h2>
      <p>
        In some regions (like the European Economic Area), you have rights that allow you greater access to and control over your personal information. You may review, change, or terminate your account at any time.
      </p>
      <h2>Updates to This Policy</h2>
      <p>
        We may update this privacy notice from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible.
      </p>
      <h2>Contact Us</h2>
      <p>
        If you have questions or comments about this policy, you may email us at LaskoCreative@gmail.com or by post to:
        <br />
        LaskoCreative
      </p>
    </div>
  );
}

export default Privacy;
