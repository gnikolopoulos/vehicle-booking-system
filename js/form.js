var map;
var route;

init()
function init() {
  if (!store.enabled) {
    alert('Local storage is not supported by your browser. Please disable "Private Mode", or upgrade to a modern browser.')
    return
  }
}

jQuery(document).ready(function($) {

  flush(); // Remove for pruduction

  $.validator.addMethod("notEqual", function(value, element, param) {
    return this.optional(element) || value != param;
  }, "The pickup and dropoff points cannot be the same");

  $.validator.addMethod('minStrict', function (value, el, param) {
    return value >= param;
  });

  $(".formStep1").validate({
    rules: {
      pickup: {
        required: true,
        notEqual: '#dropoff'
      },
      dropoff: {
        required: true,
        notEqual: '#pickup'
      },
      date_pickup: {
        required: true
      },
      time_pickup: {
        required: true
      }
    },
    messages: {
      pickup: {
        required: "Select a pickup address"
      },
      dropoff: {
        required: "Select a dropoff address"
      },
      date_pickup: {
        required: "Select a date"
      },
      time_pickup: {
        required: "Select a time"
      }
    },
    errorClass: "errormessage",
    onkeyup: false,
    errorClass: 'error',
    validClass: 'valid',
    errorPlacement: function(error, element) {
      var elem = $(element)
      if(!error.is(':empty')) {
         elem.filter(':not(.valid)').qtip({
            overwrite: false,
            content: error,
            position: {
               my: 'bottom center',
               at: 'top center',
               viewport: $(window)
            },
            show: {
               event: false,
               ready: true
            },
            hide: false,
         })
         .qtip('option', 'content.text', error);
      }
      else { elem.qtip('destroy'); }
    },
    success: $.noop
  })

  $(".formStep3").validate({
    rules: {
      first_name: {
        required: true
      },
      last_name: {
        required: true
      },
      email: {
        required: true,
        email: true
      },
      phone: {
        required: true
      },
      lead: {
        required: true
      },
      adults: {
        required: true,
        minStrict: 1,
        number: true
      },
      kids: {
        number: true
      },
      luggage: {
        number: true
      },
      hand: {
        number: true
      },
      payment: {
        required: true
      }
    },
    messages: {
      first_name: {
        required: "Enter your first name"
      },
      last_name: {
        required: "Enter your last name"
      },
      email: {
        required: "Enter your email address"
      },
      phone: {
        required: "Enter a contact phone"
      },
      lead: {
        required: "Please select if this booking is for you or others"
      },
      adults: {
        required: "Please enter number of adults",
        minStrict: "You cannot have less than 1 adults",
        number: "Only numbers are accepted"
      },
      kids: {
        number: "Only numbers are accepted"
      },
      luggage: {
        number: "Only numbers are accepted"
      },
      hand: {
        number: "Only numbers are accepted"
      },
      payment: {
        required: "Please select a payment method"
      }
    },
    errorClass: "errormessage",
    onkeyup: false,
    errorClass: 'error',
    validClass: 'valid',
    errorPlacement: function(error, element) {
      var elem = $(element)
      if(!error.is(':empty')) {
         elem.filter(':not(.valid)').qtip({
            overwrite: false,
            content: error,
            position: {
               my: 'bottom center',
               at: 'top center',
               viewport: $(window)
            },
            show: {
               event: false,
               ready: true
            },
            hide: false,
         })
         .qtip('option', 'content.text', error);
      }
      else { elem.qtip('destroy'); }
    },
    success: $.noop
  })

  // Create map element
  map = new GMaps({
    el: '#map-canvas',
    lat: -12.043333,
    lng: -77.028333,
    zoom: 16,
    height: '500px',
    width: '500px'
  });

  // Geocomplete address fields
  $("#pickup").geocomplete({
    details: ".details",
    detailsAttribute: "data-orig",
  });
  $("#dropoff").geocomplete({
    details: ".details",
    detailsAttribute: "data-dest",
  });

  // Init for date-time fields
  $.datetimepicker.setLocale('en');
  $("#date_pickup").datetimepicker({
    timepicker:false,
    format:'d.m.Y',
    minDate:'0',
    maxDate: '+1970/01/30'
  });

  $("#time_pickup").datetimepicker({
    datepicker:false,
    format:'H:i'
  });

  $("#date_return").datetimepicker({
    timepicker:false,
    format:'d.m.Y',
    minDate:'0',
    maxDate: '+1970/01/30'
  });

  $("#time_return").datetimepicker({
    datepicker:false,
    format:'H:i'
  });

  // Show return date & time if selected
  $("#return").change(function(){
    $(".return_group").toggle(this.checked);
    set( 'return', '1' );
  })

  var pickup_loc = '0'; // 0 for address, 1 for location
  var dropoff_loc = '0'; // 0 for address, 1 for location

  $(".pick-loc-select").on("click", function(e) {
    e.preventDefault();
    $("#pickup, #pickup_location").toggle();
    if( pickup_loc == '0' ) {
      pickup_loc = '1';
      $(".pick-loc-select").html('Enter address');
    } else {
      pickup_loc = '0';
      $(".pick-loc-select").html('Select Location');
      set('start_location_id', '0');
    }
  })

  $(".drop-loc-select").on("click", function(e) {
    e.preventDefault();
    $("#dropoff, #dropoff_location").toggle();
    if( dropoff_loc == '0' ) {
      dropoff_loc = '1';
      $(".drop-loc-select").html('Enter address');
    } else {
      dropoff_loc = '0';
      $(".drop-loc-select").html('Select Location');
      set('end_location_id', '0');
    }
  })

  $('#pickup_location').change(function(){
    set('start_location_id', $('#pickup_location').find('option:selected').data('id'));
  });

  $('#dropoff_location').change(function(){
    set('end_location_id', $('#dropoff_location').find('option:selected').data('id'));
  });

  $(".route").on("click", function(e){
    e.preventDefault();
    var distance = 0;
    $("#route-info").show().html('<i class="fa fa-spinner fa-pulse"></i> Calculating optimal route...');
    var waypts = [];
    var selected_pickup;
    var selected_destination;

    if(pickup_loc == '1') {
      selected_pickup = $("#pickup_location").find('option:selected').val();
    } else {
      selected_pickup = $("#pickup").val();
    }

    if(dropoff_loc == '1') {
      selected_destination = $("#dropoff_location").find('option:selected').val();
    } else {
      selected_destination = $("#dropoff").val();
    }

    if( $("#base_location").val() != '' ) {
      waypts.push({
        location: selected_pickup,
        stopover: false
      })
      map.removeRoutes();
      map.getRoutes({
        origin: $('#base_location').val(),
        destination: selected_destination,
        waypoints: waypts,
        travelMode: 'driving',
        callback: function(results){
          routes = results;
          distance = routes[0].legs[0].distance.value;
          set('dist', distance);

          map.drawRoute({
            origin: $('#base_location').val(),
            destination: selected_destination,
            waypoints: waypts,
            travelMode: 'driving',
            strokeColor: '#131540',
            strokeOpacity: 0.6,
            strokeWeight: 6
          });

          GMaps.geocode({
            address: selected_pickup,
            callback: function(results, status) {
              if (status == 'OK') {
                var latlng = results[0].geometry.location;
                map.setCenter(latlng.lat(), latlng.lng());
                map.addMarker({
                  lat: latlng.lat(),
                  lng: latlng.lng()
                });
              }
            }
          });

          $("#route-info").html( '<i class="fa fa-map-o"></i> ' + routes[0].legs[0].distance.text + ' (aprox. ' + routes[0].legs[0].duration.text + ')' + ' <a data-fancybox data-src="#route_map" href="javascript:;"><i class="fa fa-map-signs"></i></a>' );
        }
      });
    } else {
      map.removeRoutes();
      map.getRoutes({
        origin: selected_pickup,
        destination: selected_destination,
        travelMode: 'driving',
        callback: function(results){
          routes = results;
          distance = routes[0].legs[0].distance.value;
          set('dist', distance);

          map.drawRoute({
            origin: $('#base_location').val(),
            destination: selected_destination,
            waypoints: waypts,
            travelMode: 'driving',
            strokeColor: '#131540',
            strokeOpacity: 0.6,
            strokeWeight: 6
          });

          GMaps.geocode({
            address: selected_pickup,
            callback: function(results, status) {
              if (status == 'OK') {
                var latlng = results[0].geometry.location;
                map.setCenter(latlng.lat(), latlng.lng());
                map.addMarker({
                  lat: latlng.lat(),
                  lng: latlng.lng()
                });
              }
            }
          });

          $("#route-info").html( '<i class="fa fa-map-o"></i> ' + routes[0].legs[0].distance.text + ' (aprox. ' + routes[0].legs[0].duration.text + ')' + ' <a data-fancybox data-src="#route_map" href="javascript:;"><i class="fa fa-map-signs"></i></a>' );
        }
      });
    }
  });

  // Ajax handler for all buttons
  $(".btn").on("click", function(e){
    e.preventDefault();
    var contents = $(this).html();
    $(this).html('<i class="fa fa-spinner fa-pulse"></i> Working...');
    if( $(this).data("goto") == '2' && $(".formStep1").valid() ) {
      if(pickup_loc == '1') {
        set( 'start', $("#pickup_location").val() );
      } else {
        set( 'start', $("#pickup").val() );
      }
      if(dropoff_loc == '1') {
        set( 'end', $("#dropoff_location").val() );
      } else {
        set( 'end', $("#dropoff").val() );
      }
      set( 'pickup_date', $("#date_pickup").val() );
      set( 'pickup_time', $("#time_pickup").val() );
      if( get('return') == '1' ) {
        set( 'return_date', $("#date_return").val() );
        set( 'return_time', $("#time_return").val() );
      }
      set( 'orig_zip', $('#orig_zip').val() );
      set( 'dest_zip', $('#dest_zip').val() );

      // Form data
      var fd = new FormData();
      fd.append( "action", "get_cars" );
      fd.append( "distance", get('dist') );
      fd.append( "pickup_date", get('pickup_date') );
      fd.append( "pickup_time", get('pickup_time') );
      fd.append( "return", get('return') );
      fd.append( "start_id", get('start_location_id') );
      fd.append( "end_id", get('end_location_id') );
      fd.append( "orig_zip", get('orig_zip') );
      fd.append( "dest_zip", get('dest_zip') );

      // ajax call
      $.ajax({
        url: booking.ajax_url,
        processData: false,
        contentType: false,
        data: fd,
        type: 'POST',
        responseType: 'html',
        dataType: 'html',
        success: function( response ) {
          $(".cars").html(response);
          $(".step1, .step2").slideToggle();
        }
      })
    } else if ( $(this).data("goto") == '3' ) {
      set('cost', $("input[name=cost]:checked").val() );
      set('car', $("input[name=cost]:checked").data("id") );

      //set('car_adults', $("input[name=cost]:checked").data("adults") );
      //set('car_kids', $("input[name=cost]:checked").data("kids") );
      //set('car_luggage', $("input[name=cost]:checked").data("luggage") );
      //set('car_hand', $("input[name=cost]:checked").data("hand") );

      $("#total_cost").html( get('cost') );

      // Toggle
      $(".step2, .step3").slideToggle();

    } else if ( $(this).data("goto") == '4' && $(".formStep3").valid() ) {
      set( 'first_name', $("#first_name").val() );
      set( 'last_name', $("#last_name").val() );
      set( 'email', $("#email").val() );
      set( 'phone', $("#phone").val() );

      set( 'lead', $("input[name=lead]:checked").val() );
      set( 'lead_first_name', $('#lead_first_name').val() );
      set( 'lead_last_name', $('#lead_last_name').val() );
      set( 'lead_email', $('#lead_email').val() );
      set( 'lead_phone', $('#lead_phone').val() );

      set( 'adults', $('#adults').val() );
      set( 'kids', $('#kids').val() );
      set( 'luggage', $('#luggage').val() );
      set( 'hand', $('#hand').val() );

      set( 'notes', $("#comments").val() );
      set( 'payment', $("input[name=payment]:checked").val() );

      // Populate summary screen
      $("#s_full-name").html( get('first_name') + ' ' + get('last_name') );
      $("#s_email").html( get('email') );
      $("#s_phone").html( get('phone') );
      $("#s_comments").html( get('notes') );

      $("#s_pickup").html( get('start') );
      $("#s_dropoff").html( get('end') );

      if( get('lead') != 'self' ) {
        $('#lp_full-name').html( get('lead_first_name') + ' ' + get('lead_last_name') );
        $("#lp_email").html( get('lead_email') );
        $("#lp_phone").html( get('lead_phone') );
      } else {
        $('.summary .lp').hide();
      }

      $("#s_adults").html( get('adults') );
      $("#s_kids").html( get('kids') );
      $("#s_luggage").html( get('luggage') );
      $("#s_hand").html( get('hand') );

      $("#s_date-pickup").html( get('pickup_date') + ' - ' + get('pickup_time') );

      if( get('return') == '1' ) {
        $("#s_return").html( 'Yes' );
        $("#s_date-return").html( get('return_date') + ' - ' + get('return_time') );
      } else {
        $(".summary .round-trip").hide();
        $("#s_return").html( 'No' );
        $("#s_date-return").html( 'N/A' );
      }

      $("#s_cost").html( get('cost') );
      if( get('payment') == 'paypal' ) {
        $("#s_payment").html( 'PayPal' );
      } else {
        $("#s_payment").html( 'Cash' );
      }

      // Toggle
      $(".step3, .step4").slideToggle();

    } else if ( $(this).data("goto") == 'end' ) {
      // Form data
      var fd = new FormData();
      fd.append( "full_name", get('first_name') + ' ' + get('last_name') );
      fd.append( "email", get('email') );
      fd.append( "phone", get('phone') );

      fd.append( 'lead', get('lead') );
      fd.append( 'lead_full_name', get('lead_first_name') + ' ' + get('lead_last_name') );
      fd.append( 'lead_email', get('lead_email') );
      fd.append( 'lead_phone', get('lead_phone') );

      fd.append( 'adults', get('adults') );
      fd.append( 'kids', get('kids') );
      fd.append( 'luggage', get('luggage') );
      fd.append( 'hand', get('hand') );

      fd.append( "payment", get('payment') );
      fd.append( "notes", get('notes') );
      fd.append( "cost", get('cost') );
      fd.append( "start", get('start') );
      fd.append( "end", get('end') );
      fd.append( "car", get('car') );
      fd.append( "pickup_date", get('pickup_date') );
      fd.append( "pickup_time", get('pickup_time') );
      fd.append( "return", get('return') );
      fd.append( "return_date", get('return_date') );
      fd.append( "return_time", get('return_time') );
      fd.append( "action", "create_booking" );
      fd.append( "distance", get('dist') );
      fd.append( "cost", get('cost') );
      fd.append( "nonce", $("#security").val() );

      // Ajax call to create booking
      $.ajax({
        url: booking.ajax_url,
        processData: false,
        contentType: false,
        data: fd,
        type: 'POST',
        responseType: 'json',
        dataType: 'json',
        success: function( booking_response ) {
          $(".final > .response").html(booking_response['text']);
          var booking_id = booking_response['id'];
          var booking_code = booking_response['code'];
          $(".step4, .final").slideToggle();
          //console.log( booking_response['email'] );
          if( get('payment') == 'paypal' ) {
            var payment_data = new FormData();
            payment_data.append( "cost", get('cost') );
            payment_data.append( "id" , booking_id);
            payment_data.append( "code" , booking_code);
            payment_data.append( "action", "create_payment" );

            // Ajax call to create PayPal form
            $.ajax({
              url: booking.ajax_url,
              processData: false,
              contentType: false,
              data: payment_data,
              type: 'POST',
              responseType: 'html',
              dataType: 'html',
              success: function( paypal_response ) {
                $('.addon').html( paypal_response );
                $('.paypal > form').submit();
                flush();
              }
            })
          }
        }
      })

    }

    $(this).html(contents);
  })

  $('input[type=radio][name=lead]').change(function () {
    if( this.value != 'self' ) {
      $(".lead_passenger").show();
    } else {
      $(".lead_passenger").hide();
    }
  })

  $("#adults, #kids, #luggage, #hand").change(function () {
    if( this.value ) {
      var passenger_data = new FormData();
      passenger_data.append( "cost", get('cost') );
      passenger_data.append( 'adults', $('#adults').val() );
      passenger_data.append( 'kids', $('#kids').val() );
      passenger_data.append( 'luggage', $('#luggage').val() );
      passenger_data.append( 'hand', $('#hand').val() );
      passenger_data.append( "car", get('car') );
      passenger_data.append( "action", "recalculate_cost" );

      // Ajax call to re-calculate cost based on passenger info
      $.ajax({
        url: booking.ajax_url,
        processData: false,
        contentType: false,
        data: passenger_data,
        type: 'POST',
        responseType: 'html',
        dataType: 'html',
        success: function( cost_response ) {
          $('#total_cost').html( cost_response );
          set('cost', cost_response);
          console.log( get('cost') );
        }
      })
    }
  })

});

function set( key, data ) {
  store.set(key, data);
}

function get( key ) {
  data = store.get(key);
  return data;
}

function all() {
  store.forEach(function(key, val) {
    console.log(key, '==', val);
  })
}

function flush() {
  store.clear();
}