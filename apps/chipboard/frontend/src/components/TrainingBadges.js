import React from 'react';
import './TrainingBadges.css';

function TrainingBadges({ ethosTrainingComplete, bmwTrainingComplete, size = 'small' }) {
  return (
    <div className={`training-badges ${size}`}>
      {ethosTrainingComplete && (
        <img 
          src="/assets/images/EthosIcon.png" 
          alt="Ethos Training Complete" 
          className="training-badge ethos"
          title="Ethos Training Complete"
        />
      )}
                   {bmwTrainingComplete && (
               <img 
                 src="/assets/images/BMW_Grey-Colour_RGB.png" 
                 alt="BMW Training Complete" 
                 className="training-badge bmw"
                 title="BMW Training Complete"
               />
             )}
    </div>
  );
}

export default TrainingBadges; 