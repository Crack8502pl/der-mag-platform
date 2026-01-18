import React from 'react';
import { GenericConfigStep } from '../common/GenericConfigStep';
import { SubsystemConfigStepProps } from '../../types/wizard.types';

export const SmokipBConfigStep: React.FC<SubsystemConfigStepProps> = (props) => {
  return <GenericConfigStep {...props} />;
};
