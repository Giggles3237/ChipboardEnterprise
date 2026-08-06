import TVScreenBarChart         from './TVScreenBarChart';
import TVScreenLeaderboard      from './TVScreenLeaderboard';
import TVScreenTypeBreakdown    from './TVScreenTypeBreakdown';
import TVScreenPaceTracker      from './TVScreenPaceTracker';
import TVScreenPendingDeliveries from './TVScreenPendingDeliveries';
import TVScreenClosestToGoal    from './TVScreenClosestToGoal';
import TVScreenMonthOverMonth   from './TVScreenMonthOverMonth';
import TVScreenTeamDonut        from './TVScreenTeamDonut';
import TVScreenWholesale        from './TVScreenWholesale';

export const TV_SCREENS = [
  { id: 'bar_chart',           label: 'Advisor Bar Chart',     component: TVScreenBarChart },
  { id: 'leaderboard',         label: 'Monthly Leaderboard',   component: TVScreenLeaderboard },
  { id: 'type_breakdown',      label: 'Sales by Type',         component: TVScreenTypeBreakdown },
  { id: 'pace_tracker',        label: 'Pace to Goal',          component: TVScreenPaceTracker },
  { id: 'pending_deliveries',  label: 'Pending Deliveries',    component: TVScreenPendingDeliveries },
  { id: 'closest_to_goal',     label: 'Closest to Goal',       component: TVScreenClosestToGoal },
  { id: 'month_over_month',    label: 'Month vs Last Year',    component: TVScreenMonthOverMonth },
  { id: 'team_donut',          label: 'Team Type Breakdown',   component: TVScreenTeamDonut },
  { id: 'wholesale',           label: 'Wholesale Count',       component: TVScreenWholesale },
];

export const DEFAULT_SETTINGS = {
  activeScreens: ['bar_chart', 'leaderboard', 'type_breakdown'],
  rotationInterval: 20,
};
