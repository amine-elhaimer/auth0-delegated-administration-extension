import { fromJS } from 'immutable';
import _ from 'lodash';
import * as constants from '../constants';
import createReducer from '../utils/createReducer';

const initialState = {
  loading: false,
  error: null,
  record: { settings: { dict: { title: '', memberships: '' }, userFields: [], css: '' } }
};

const parseDisplay = (property, displayAttribute, display) => {
  if (display !== undefined &&
    _.isString(display) &&
    display.startsWith('function')) {
    try {
      // TODO: this is scary => what else can we do?
      display = eval(`(${display})`);
    } catch (error) {
      console.error(`The ${displayAttribute} function for field ${property} throws an error`, error);
      // doing this because I couldn't get the tests to work when
      // passing back a function pointer for expect
      return eval('(function() { return "error"; })');
    }
  }

  return display;
};

const parseOptions = (options) => {
  // Parse options
  if (_.isArray(options)) {
    options = options.map((option) => {
      if (_.isString(option)) {
        return { label: option, value: option };
      } else if (_.isObject(option) && _.has(option, 'label') && _.has(option, 'value')) {
        return option;
      }

      return { label: 'Error', value: '' };
    });
  }

  return options;
};

const parseFieldSection = (property, sectionInfo, sectionName, inheritedDisplay) => {
  if (sectionInfo && _.isObject(sectionInfo)) {
    const sectionDisplay = parseDisplay(property, `${sectionName}.display`, sectionInfo.display);
    const display = sectionDisplay !== undefined ? sectionDisplay : inheritedDisplay;
    if (display !== undefined) sectionInfo.display = display;
    if (sectionInfo.options) sectionInfo.options = parseOptions(sectionInfo.options);
  }
};

export const settings = createReducer(fromJS(initialState), { // eslint-disable-line import/prefer-default-export
  [constants.FETCH_SETTINGS_PENDING]: (state) =>
    state.merge({
      loading: true,
      error: null
    }),
  [constants.FETCH_SETTINGS_REJECTED]: (state, action) =>
    state.merge({
      loading: false,
      error: `An error occurred while loading the connections: ${action.errorMessage}`
    }),
  [constants.FETCH_SETTINGS_FULFILLED]: (state, action) => {
    const data = action.payload.data;
    if (data.settings.userFields) {
      data.settings.userFields.forEach((field) => {
        parseFieldSection(field.property, field, 'userField');
        parseFieldSection(field.property, field.edit, 'userField.edit', field.display);
        parseFieldSection(field.property, field.create, 'userField.create', field.display);
        parseFieldSection(field.property, field.search, 'userField.search', field.display);
      });
    }
    return state.merge({
      loading: false,
      error: null,
      record: fromJS(data)
    });
  }

});
