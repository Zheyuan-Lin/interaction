/**
 * Application-wide constants
 */
export class AppConstants {
  // Group name for all interactions and insights
  static readonly GROUP_NAME = "socratic";
  
  // Default app configuration
  static readonly DEFAULT_APP_MODE = "synthetic_voters_v14.csv";
  static readonly DEFAULT_APP_TYPE = "AWARENESS";
  static readonly DEFAULT_APP_LEVEL = "live";
  
  // Interaction types
  static readonly INTERACTION_TYPES = {
    CLICK_ADD_ITEM: "click_add_item",
    CLICK_REMOVE_ITEM: "click_remove_item",
    CLICK_GROUP: "click_group",
    MOUSEOVER_ITEM: "mouseover_item",
    MOUSEOUT_ITEM: "mouseout_item",
    MOUSEOVER_GROUP: "mouseover_group",
    MOUSEOUT_GROUP: "mouseout_group",
    QUESTION_RESPONSE: "question_response"
  };
}
