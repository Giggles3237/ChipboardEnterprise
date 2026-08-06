// path/to/frontend/src/pages/Terms.js

import React from 'react';
import './Terms.css'; // Ensure you have the CSS file for styling

/**
 * Terms Component
 * 
 * Displays the Terms of Use of the application.
 */
function Terms() {
  return (
    <div className="terms-page">
      <h1>Terms of Service</h1>
      <p>Effective Date: [Insert Date]</p>
      <h2>Introduction</h2>
      <p>
        Welcome to LaskoCreative. By accessing or using our website, you agree to comply with and be bound by the following terms and conditions of use, which together with our privacy policy govern LaskoCreative's relationship with you in relation to this website.
      </p>
      <h2>Use of the Website</h2>
      <p>
        The content of the pages of this website is for your general information and use only. It is subject to change without notice.
      </p>
      <h2>Intellectual Property</h2>
      <p>
        This website contains material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance, and graphics. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.
      </p>
      <h2>Limitation of Liability</h2>
      <p>
        Your use of any information or materials on this website is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services, or information available through this website meet your specific requirements.
      </p>
      <h2>Governing Law</h2>
      <p>
        Your use of this website and any dispute arising out of such use of the website is subject to the laws of [Your Country/State].
      </p>
      <h2>Contact Us</h2>
      <p>
        If you have any questions about these Terms, please contact us at LaskoCreative@gmail.com.
      </p>
    </div>
  );
}

export default Terms;
