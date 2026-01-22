# Interaction Types Documentation

This document provides a comprehensive overview of all interaction types tracked by the system and how to trigger them.

## Total Interaction Types: 27

All interactions now use a standardized recording system through `sendInteractionResponse()` with consistent data structures.

## Interaction Categories

### 1. Attribute Accordion Operations (2 types)
- **`toggle_attribute_accordion_awareness_panel`** - Click individual attribute cards to expand/collapse
- **`toggle_all_attribute_accordion_awareness_panel`** - Click "expand all" or "collapse all" buttons

### 2. Attribute Panel Bookmark Operations (2 types)
- **`toggle_attribute_bookmark_awareness_panel`** - Click bookmark icon on individual attributes
- **`toggle_all_attribute_bookmark_awareness_panel`** - Click "remove all bookmarks" button

### 3. Sorts (2 types)
- **`attribute_panel_sort_changed`** - Change sort dropdown in attribute panel
- **`distribution_panel_sort_changed`** - Change sort dropdown in distribution panel

### 4. Filters (4 types)
- **`filter_added`** - Enable a filter for an attribute
- **`filter_removed`** - Disable/remove a filter
- **`all_filters_removed`** - Click "remove all filters" button
- **`filter_changed`** - Modify filter values (sliders, dropdowns)

### 5. Encodings (6 types)
- **`all_encodings_removed`** - Click "reset all encodings" button
- **`axis_attribute_changed`** - Change X or Y axis attribute dropdowns
- **`axes_attributes_swapped`** - Click swap X/Y button
- **`aggregation_changed`** - Change aggregation type dropdown
- **`chart_type_changed`** - Change chart type dropdown
- **`vis_color_by_changed`** - Change visualization color mode
- **`attribute_panel_color_by_changed`** - Change attribute panel color mode

### 6. Visualization Interactions (8 types)
- **`click_add_item`** - Click on individual data points (circles, dots) - **NOW AVAILABLE TO ALL USERS**
- **`click_remove_item`** - Click on already selected individual data points - **NOW AVAILABLE TO ALL USERS**
- **`click_group`** - Click on grouped elements (bars, line segments) - **NOW AVAILABLE TO ALL USERS**
- **`mouseover_item`** - Hover over individual data points for 350ms+
- **`mouseover_group`** - Hover over grouped elements for 350ms+
- **`mouseout_item`** - Stop hovering over individual data points
- **`mouseout_group`** - Stop hovering over grouped elements

### 7. User Insights (3 types)
- **`save_user_insight`** - Click "Send Insight" button after typing insight
- **`edit_user_insight`** - Edit existing insight (inline editing or prompt-based)
- **`delete_user_insight`** - Delete an existing insight (with confirmation)

## Key Changes Made

### 1. ✅ Removed Admin-Only Restrictions
- **Before**: Click interactions only worked for `appType === "ADMIN"`
- **After**: All click interactions (`click_add_item`, `click_remove_item`, `click_group`) now work for ALL users
- **Files Modified**: All visualization components (scatter-plot, strip-plot, dot-plot, bar-chart, line-chart)

### 2. ✅ Standardized Messaging System
- **Before**: Different interaction types used different endpoints:
  - Standard interactions → `sendInteractionResponse()` → `"on_interaction"`
  - User insights → `sendInsights()` → `"on_insight"`
- **After**: ALL interactions now use `sendInteractionResponse()` with backward compatibility

### 3. ✅ Clean Console Logging
- **Before**: Verbose debug output with detailed timesVisited calculations
- **After**: Clean console output showing only `Interaction: [type]`

### 4. ✅ TimesVisited Behavior Explained
- **`click_group` (bars)**: Increments `timesVisited` for ALL data points in the clicked bar/group
- **`click_add_item/click_remove_item` (individual points)**: Only changes selection state, does NOT affect `timesVisited`
- **Reason**: Group clicks represent "examining a category", individual clicks represent "selecting specific points"

### 5. ✅ Consistent Data Structure
- All interactions now have standardized fields:
  - `interactionType`: Standard enum value
  - `interactionAt`: Timestamp
  - `interactionDuration`: Duration in ms
  - `participantId`: User ID
  - `appType`, `appLevel`, `appMode`, `chartType`: Context
  - `data`: Object with `eventX`, `eventY` and specific interaction data
  - `group`: Always "socratic" (defined in AppConstants.GROUP_NAME)

### 4. ✅ Validation System
- Added `validateAndStandardizeMessage()` function
- Ensures all messages have required fields
- Provides warnings for malformed messages

## How to Trigger Each Interaction Type

### Most Common (High Volume)
1. **mouseover_item/mouseout_item**: Hover over individual dots/points in scatter plots
2. **axis_attribute_changed**: Change X/Y axis dropdowns frequently
3. **mouseover_group/mouseout_group**: Hover over bars in bar charts
4. **chart_type_changed**: Switch between chart types
5. **filter_changed**: Adjust filter sliders/dropdowns

### Medium Volume
6. **click_group**: Click on bars in bar charts (now available to all users)
7. **aggregation_changed**: Change aggregation type
8. **toggle_attribute_accordion_awareness_panel**: Expand/collapse attribute cards

### Lower Volume  
9. **click_add_item/click_remove_item**: Click individual data points (now available to all users)
10. **filter_added/removed**: Enable/disable filters
11. **axes_attributes_swapped**: Use swap button
12. **vis_color_by_changed**: Change color modes
13. **all_filters_removed/all_encodings_removed**: Use reset buttons
14. **save_user_insight**: Type and send insights
15. **edit_user_insight**: Click edit button on existing insights or use prompt-based editing
16. **delete_user_insight**: Click delete button on existing insights (with confirmation)
17. **Various toggles**: Bookmark and accordion operations

### Requires Backend Setup
18. **question_response**: Backend must send questions first

## Expected Database Impact

After these changes, you should see:
- **Previously Missing**: `click_add_item`, `click_remove_item`, `click_group`, `save_user_insight`, `edit_user_insight`, `delete_user_insight`
- **Consistent Recording**: All 27 interaction types in a standardized format
- **Better Data Quality**: Consistent field names and data structures
- **Clean Logging**: Console only shows `Interaction: [type]` instead of verbose debug output

## Files Modified

1. **Visualization Components**:
   - `/src/app/visualizations/main/scatter-plot-component.ts`
   - `/src/app/visualizations/main/strip-plot-component.ts` 
   - `/src/app/visualizations/main/dot-plot-component.ts`
   - `/src/app/visualizations/main/bar-chart-component.ts`
   - `/src/app/visualizations/main/line-chart-component.ts`

2. **Core Services**:
   - `/src/app/services/utils.service.ts`
   - `/src/app/services/socket.service.ts`

3. **Main Component**:
   - `/src/app/main-activity/component.ts`

4. **Configuration**:
   - `/src/app/models/config.ts` (removed unused CONTINUE_AFTER_INSIGHTS)