import React from 'react';
import { SubsystemConfigStepProps } from '../../types/wizard.types';
import { GenericConfigStep } from '../common/GenericConfigStep';

export const SkdConfigStep: React.FC<SubsystemConfigStepProps> = (props) => {
  return <GenericConfigStep {...props} />;
};
