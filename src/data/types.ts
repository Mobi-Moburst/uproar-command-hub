export interface Client {
  id: string;
  name: string;
  status: "Active" | "Inactive" | "Onboarding";
  team_name: string;
  vertical: string;
  active_campaign: string;
  total_placements: number;
  total_reach: number;
  total_ad_value: number;
  total_award_submissions: number;
  total_award_wins: number;
  last_placement_date: string;
  health?: "red" | "yellow" | "green";
}

export interface MediaPlacement {
  id: string;
  date: string;
  client_name: string;
  team_name: string;
  outlet: string;
  reporter_name: string;
  headline: string;
  link: string;
  type: string;
  vertical: string;
  readership_viewership: number;
  ad_value: number;
  secured_by: string;
  topic_product: string;
  notes: string;
  weekly_wins_trigger: boolean;
}

export interface AwardSubmission {
  id: string;
  client_name: string;
  award_name: string;
  award_edition: string;
  status: string;
  team_name: string;
  submission_title: string;
  due_date: string;
  submitted_date: string | null;
  result: string | null;
  notes: string;
}

export interface Team {
  id: string;
  team_name: string;
  placement_count: number;
  total_reach: number;
  total_ad_value: number;
  total_submissions: number;
  total_wins: number;
}

export interface Outlet {
  id: string;
  name: string;
  type: string;
}

export interface Sample {
  id: string;
  date_requested: string;
  team: string;
  client: string;
  products: string;
  outlet: string;
  reporter_name: string;
  date_shipped: string;
  delivery_date: string;
  status: string;
  publication_date: string;
  coverage_link: string;
  notes: string;
}

export interface Briefing {
  id: string;
  date_met: string;
  team: string;
  client: string;
  outlet: string;
  reporter_name: string;
  spokesperson: string;
  uproar_contact: string;
  topic: string;
  interview_type: string;
  briefing_sheet_url: string;
  status: string;
  publication_date: string;
  coverage_link: string;
  notes: string;
}
