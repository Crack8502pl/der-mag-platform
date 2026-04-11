import React from 'react';
import { GenericConfigStep } from '../common/GenericConfigStep';
import { NetworkPoolFields } from '../common/NetworkPoolFields';
import type { SubsystemConfigStepProps } from '../../types/wizard.types';

export const SmokipBConfigStep: React.FC<SubsystemConfigStepProps> = (props) => {
  const { subsystem, subsystemIndex, onUpdate } = props;
  const params = (subsystem.params || {}) as unknown as Record<string, string>;

  const handleApplyNetworkResult = (gateway: string, subnet: string) => {
    const current = (subsystem.params || {}) as Record<string, string | number | boolean>;
    onUpdate(subsystemIndex, { params: { ...current, gatewayIP: gateway, subnetMask: subnet } as any });
  };

  const handleUpdateIpPool = (value: string) => {
    onUpdate(subsystemIndex, { ipPool: value });
  };

  return (
    <>
      <GenericConfigStep {...props} />
      <div className="wizard-step-content" style={{ paddingTop: 0 }}>
        <NetworkPoolFields
          ipPool={subsystem.ipPool || ''}
          gatewayIP={params.gatewayIP || ''}
          subnetMask={params.subnetMask || ''}
          onUpdateIpPool={handleUpdateIpPool}
          onApplyNetworkResult={handleApplyNetworkResult}
        />
      </div>
    </>
  );
};

