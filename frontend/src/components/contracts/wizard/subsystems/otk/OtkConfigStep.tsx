import React from 'react';
import { SubsystemConfigStepProps } from '../../types/wizard.types';
import { GenericConfigStep } from '../common/GenericConfigStep';

export const OtkConfigStep: React.FC<SubsystemConfigStepProps> = (props) => {
  return <GenericConfigStep {...props} />;
};
