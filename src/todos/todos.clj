(ns todos.todos
  (:require [clojure.string :as str])
  (:use 
   todos.util
   [clojure.data.json :only [json-str read-json]]
   [net.cgrand.moustache :exclude [not-found]]))

(def api-path "todos_v1")

(let [next-id (atom 0)]
  (defn- get-next-id
    []
    (swap! next-id inc)))

(defonce todos (atom {}))

(defn parse-int
  [val]
  (try
    (Integer/parseInt val)
    (catch Exception e nil)))

;;CREATE
(defn add-todo
  "Adds a todo to the list of todos, returns the todo with Id added"
  [data]
  (println "Adding todo: " data)
  (let [new-todo (assoc data :id (get-next-id))]
    (swap! todos
           #(assoc % (:id new-todo) new-todo))
    new-todo))

(defn create
  [req]
  (let [todo-data (read-json (request-body req))
        new-todo (add-todo todo-data)]
    {:status 201
     :headers (merge json-header
                     {"Location" (str api-path "/" (:id new-todo))})
     :body (json-str new-todo)}))


;;DELETE
(defn remove-todo
  [id req]
  (let [id (parse-int id)]
    (println (format "Removing todo with id: '%s'" id))
    (if id
      (do
        (swap! todos
               #(dissoc % id))
        {:status 200})
      {:status 500})))

(def delete
  (app
   [""] pass
   [id] (partial remove-todo id)))

;;READ
(defn get-one
  [id req]
  (println "Get one -- ID: " id)
  (let [id (parse-int id)]
    (if (contains? @todos id)
      (json-response (@todos id))
      (do-404 req))))

(defn get-all
  [& req]
  (println "Get all")
  (json-response (vals @todos)))

(def fetch
  (app
   [""] get-all
   [id] (partial get-one id)
   [&] pass))

;;UPDATE

(defn update-many
  [req]
  (println "update-all")
  (let [todo-data (read-json (request-body req))]
    (swap! todos merge (zipmap (map :id todo-data) todo-data))
    (json-response (vals @todos))))

(defn update-one
  [id req]
  (let [todo-data (read-json (request-body req))]
    (if (contains? @todos id)
      (do
        (swap! todos #(assoc % id todo-data))
        (json-response (@todos id)))
      (do-404 req))))

(def update
  (app
   [""] update-many
   [id] (partial update-one id)
   [&] pass))

;;PATCH
(defn patch
  [req]
  (let [id (parse-int (second (str/split (:path-info req) #"/")))
        todo-data (read-json (request-body req))]
    (if (contains? @todos id)
      (do
        (swap! todos #(update-in % [id] merge todo-data))
        (json-response (@todos id)))
      (do-404 req))))

(def routes
  (app
   :get fetch
   :put update
   :post create
   :patch patch
   :delete delete))

;;Test code

(defn random-string
  "Generate from 1-4 2-5 character 'words' made up by
   interleaving consonants and vowels"
  []
  (let [vowels (apply vector "aeiouy")
        consonants (apply vector "bcdfghjklmnpqrstvwxz")]
    (loop [words (inc (rand-int 4))
           string []]
      (if (zero? words)
        (apply str string)
        (recur (dec words)
               (concat string
                       (take (+ 2 (rand-int 4))
                             (apply
                              interleave (shuffle [(repeatedly #(rand-nth consonants))
                                                   (repeatedly #(rand-nth vowels))])))
                       (if (> words 1)
                         [\space]
                         nil)))))))

(defn generate-todo
  [id order]
  {:id id
   :order order
   :done false
   :title (random-string)})

(defn generate-todos
  [num start-id start-order]
  (loop [acc {}
         id (+ start-id num)
         order (+ start-order num)]
    (if (= start-id id)
      acc
      (recur
       (assoc acc id (generate-todo id order))
       (dec id)
       (dec order)))))

(defn add-todos
  [num]
  (swap! todos
         merge
         (generate-todos num
                         (inc (apply max (conj (map :id (vals @todos)) 0)))
                         (inc (apply max (conj (map :order (vals @todos)) 0))))))
