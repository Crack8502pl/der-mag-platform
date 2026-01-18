import React from 'react';
import { GenericConfigStep } from '../common/GenericConfigStep';
import { SubsystemConfigStepProps } from '../../types/wizard.types';

export const SmokipAConfigStep: React.FC<SubsystemConfigStepProps> = (props) => {
  return <GenericConfigStep {...props} />;
};
