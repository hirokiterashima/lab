/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "sensor-connector",
        immutable: true
      },
      sensorType: {
        defaultValue: null
      },
      collectionTime: {
        defaultValue: null
      },
      tareValue: {
        defaultValue: 0
      }
    },
    viewOptions: {
      showClock: {
        defaultValue: true,
        propertyChangeInvalidates: false
      },
      controlButtons: {
        defaultValue: "play_reset",
        propertyChangeInvalidates: false
      },
      controlButtonStyle: {
        defaultValue: "video",
        propertyChangeInvalidates: false,
        serialize: false
      }
    }
  };
});
