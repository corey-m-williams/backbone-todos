(ns todos.util
  (:use
   [clojure.java.io :only [reader]]
   [clojure.data.json :only [json-str read-json]]))

(def json-header {"Content-Type" "application/json"})
(defn json-response
  ([data]
     (json-response data nil))
  ([data headers]
     {:status 200 :headers (merge json-header headers) :body (json-str data)}))

(defn do-404
  [& req]
  {:status 404 :headers {"Content-type" "text/plain"} :body "Not found"})

(defn request-body
  [req]
  (with-open [rdr (reader (:body req))]
    (if (.ready rdr)
      (slurp rdr)
      "null")))
