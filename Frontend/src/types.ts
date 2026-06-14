/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NavItem {
  id: string;
  label: string;
  targetId: string;
}

export interface HowItWorksStep {
  stepNumber: number;
  label: string;
  title: string;
  description: string;
  colorClass: string;
}
