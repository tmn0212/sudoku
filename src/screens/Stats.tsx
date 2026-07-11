import { ScreenHeader } from '../components/ScreenHeader';

export const Stats = () => (
  <div className="screen">
    <ScreenHeader title="Statistics" />
    <div className="screen__body">
      <p className="screen__placeholder">
        Your records and performance insights will appear here.
      </p>
    </div>
  </div>
);
