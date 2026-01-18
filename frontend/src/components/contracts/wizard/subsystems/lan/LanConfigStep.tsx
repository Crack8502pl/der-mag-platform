import React from 'react';
import { SubsystemConfigStepProps } from '../../types/wizard.types';
import { GenericConfigStep } from '../common/GenericConfigStep';

export const LanConfigStep: React.FC<SubsystemConfigStepProps> = (props) => {
  return <GenericConfigStep {...props} />;
};
