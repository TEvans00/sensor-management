ruleset manage_sensors {
  meta {
    name "Manage Sensors"
    description <<
      Manages a collection of temperature sensors
    >>
    author "Tyla Evans"
  }

  global {
    default_notification_number = "+13033324277"
    default_threshold = 74
  }

  rule intialization {
    select when wrangler ruleset_installed where event:attrs{"rids"} >< meta:rid
    always {
      ent:sensors := {}
    }
  }

  rule create_sensor {
    select when sensor new_sensor
    pre {
      name = event:attrs{"name"}.klog("name:")
      exists = (ent:sensors && ent:sensors >< name).klog("already exists:")
      ready = exists && ent:sensors{name}{"ready"}.klog("ready:")
    }
    if exists then
      send_directive(ready => "sensor_ready" | "initializing_sensor", {"sensor_name":name})
    notfired {
      ent:sensors{name} := {"ready": false}
      raise wrangler event "new_child_request"
        attributes { "name": name,
                     "backgroundColor": "#13A169" }
    }
  }

  rule store_sensor {
    select when wrangler new_child_created
    pre {
      eci = event:attrs{"eci"}.klog("eci:")
      name = event:attrs{"name"}.klog("name:")
    }
    if true then noop()
    fired {
      ent:sensors{name} := {"eci": eci, "ready": false}
    }
  }

  rule trigger_sensor_installation {
    select when wrangler new_child_created
    pre {
      eci = event:attrs{"eci"}.klog("eci:")
      auth_token = meta:rulesetConfig{"auth_token"}
      session_id = meta:rulesetConfig{"session_id"}
    }
    if true then
      event:send(
        { "eci": eci,
          "eid": "install-ruleset",
          "domain": "wrangler",
          "type": "install_ruleset_request",
          "attrs": {
            "absoluteURL": meta:rulesetURI,
            "rid": "sensor_installer",
            "config": {
              "auth_token": auth_token,
              "session_id": session_id
            },
          }
        }
      )
  }

  rule initialize_sensor_profile {
    select when sensor_installer installation_finished
    pre {
      eci = event:attrs{"child_eci"}.klog("eci:")
      sensor = (ent:sensors.filter(function(v,k){v{"eci"} == eci})).klog("sensor:")
      name = (sensor.keys()[0]).klog("name:")
    }
    if name then
      event:send({
        "eci": eci,
        "domain": "sensor",
        "type": "profile_updated",
        "attrs": {
          "name": name,
          "temperature_threshold": default_threshold,
          "notification_number": default_notification_number
        }
      })
  }

  rule mark_sensor_ready {
    select when sensor_installer installation_finished
    pre {
      eci = event:attrs{"child_eci"}.klog("eci:")
      sensor = (ent:sensors.filter(function(v,k){v{"eci"} == eci})).klog("sensor:")
      name = (sensor.keys()[0]).klog("name:")
      sensor_eci = event:attrs{"sensor_eci"}.klog("sensor eci:")
    }
    always {
      ent:sensors{name} := {"eci": eci, "sensor_eci": sensor_eci, "ready": true}
    }
  }
}
