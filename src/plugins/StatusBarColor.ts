import { registerPlugin } from '@capacitor/core';

interface StatusBarColorPlugin {
  setBackgroundColor(options: { color: string }): Promise<void>;
}

const StatusBarColor = registerPlugin<StatusBarColorPlugin>('StatusBarColor');

export default StatusBarColor;