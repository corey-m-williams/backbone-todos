(ns todos.core
  (:require [todos.todos :as todos])
  (:use
   todos.util
   ring.util.response
   ring.middleware.session
   ring.middleware.params
   ring.middleware.resource
   ring.middleware.file-info
   [ring.adapter.jetty :only [run-jetty]]
   [net.cgrand.moustache :exclude [not-found]]))

(def my-app-handler
  (app
   wrap-params
   wrap-session
   (wrap-resource "resources")
   (wrap-file-info)
   ["todos_v1" &] todos/routes
   ;;[""] (fn [&req] {:status 200 :headers {"Content-type" "text/html"} :body (slurp "src/resources/todos.html")})
   [""] (fn [&req] (resource-response "todos.html" {:root "resources"}))
   [&] do-404))

(defonce server
  (run-jetty #'my-app-handler {:port 8000 :join? false}))

(defn reload []
  (.stop server)
  ;;(doall (map load ["util" "todos" "core"]))
  (use 'todos.core :reload-all)
  (.start server))
