(ns todos.core
  (:use
   ring.util.response
   ring.middleware.session
   ring.middleware.params
   ring.middleware.resource
   ring.middleware.file-info
   [ring.adapter.jetty :only [run-jetty]]
   [clojure.java.io :only [reader]]
   [clojure.data.json :only [json-str read-json]]
   [net.cgrand.moustache :exclude [not-found]]))

(defn do-404
  [& req]
  {:status 404 :headers {"Content-type" "text/plain"} :body "Not found"})

(defn get-todo
  [id req]
  {:status 200 :headers {"Content-type" "text/plain"} :body (str "GET id: " id)}
  )
(defn get-todos
  [& req]
  {:status 200 :headers {"Content-type" "text/plain"} :body "GET All"}
  )
(def todos-read
  (app
   [""] get-todos
   [id] (partial get-todo id)
   [&] pass))

(defn todos-create
  [req]
  ;;Use (:body req) to access the json being sent
  (with-open [rdr (reader (:body req))]
    (println (str "Body: " (.ready rdr)))
    (if (.ready rdr)
      (println (read-json (slurp rdr)))))
  {:status 200 :headers {"Content-type" "text/plain"} :body "Create"}
  )

(defn todos-update
  [req]
  {:status 200 :headers {"Content-type" "text/plain"} :body "Update"}
  )

(defn todos-delete
  [req]
  {:status 200 :headers {"Content-type" "text/plain"} :body "Delete"}
  )

(def todos-rest
  (app
   :get todos-read
   :put todos-update
   :post todos-create
   :delete todos-delete))

(def my-app-handler
  (app
   wrap-params
   wrap-session
   (wrap-resource "resources")
   (wrap-file-info)
   ["todos_v1" &] todos-rest
   [""] (fn [&req] {:status 200 :headers {"Content-type" "text/html"} :body (slurp "src/resources/todos.html")})
   [&] do-404))

(defonce server
  (run-jetty #'my-app-handler {:port 8000 :join? false}))