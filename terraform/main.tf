terraform {
  required_providers {
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = ">= 1.16.0"
    }

    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.34.0"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

resource "kubernetes_namespace" "restaurant" {
  metadata {
    name = "restaurant"
  }
}

resource "kubernetes_deployment" "restaurant_app" {
  metadata {
    name      = "restaurant-app"
    namespace = kubernetes_namespace.restaurant.metadata[0].name
  }
  spec {
    replicas = 2
    selector {
      match_labels = {
        app = "restaurant-app"
      }
    }
    template {
      metadata {
        labels = {
          app = "restaurant-app"
        }
      }
      spec {
        node_selector = {
          hardware = "pi5"
        }

        toleration {
          key      = "hardware"
          operator = "Equal"
          value    = "pi5"
          effect   = "NoSchedule"
        }

        container {
          name  = "restaurant-app"
          image = "registry.k8s.blacktoaster.com/restaurant-tracker:latest"
          image_pull_policy = "Always"
          port {
            container_port = 5001
          }
          env {
            name  = "MONGODB_URI"
            value = "mongodb://mongodb-service:27017/restaurant-tracker"
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "restaurant_app" {
  metadata {
    name      = "restaurant-app"
    namespace = kubernetes_namespace.restaurant.metadata[0].name
  }
  spec {
    selector = {
      app = "restaurant-app"
    }
    port {
      port        = 80
      target_port = 5001
    }
    type = "ClusterIP"
  }
}

resource "kubernetes_deployment" "mongodb" {
  metadata {
    name      = "mongodb"
    namespace = kubernetes_namespace.restaurant.metadata[0].name
  }
  spec {
    replicas = 1
    selector {
      match_labels = {
        app = "mongodb"
      }
    }
    template {
      metadata {
        labels = {
          app = "mongodb"
        }
      }
      spec {
        node_selector = {
          hardware = "pi5"
        }

        toleration {
          key      = "hardware"
          operator = "Equal"
          value    = "pi5"
          effect   = "NoSchedule"
        }

        container {
          name  = "mongodb"
          image = "mongo:latest"
          port {
            container_port = 27017
          }
          volume_mount {
            name       = "mongodb-data"
            mount_path = "/data/db"
          }
        }
        volume {
          name = "mongodb-data"
          persistent_volume_claim {
            claim_name = "mongodb-pvc"
          }
        }
      }
    }
  }

  depends_on = [kubernetes_persistent_volume_claim.mongodb_pvc]
}

resource "kubernetes_service" "mongodb" {
  metadata {
    name      = "mongodb-service"
    namespace = kubernetes_namespace.restaurant.metadata[0].name
  }
  spec {
    selector = {
      app = "mongodb"
    }
    port {
      port        = 27017
      target_port = 27017
    }
    type = "ClusterIP"
  }
}

resource "kubernetes_persistent_volume_v1" "mongodb_pv" {
  metadata {
    name = "mongodb-pv"
  }
  spec {
    storage_class_name               = "nfs-storage"
    persistent_volume_reclaim_policy = "Retain"
    capacity = {
      storage = "2Gi"
    }
    access_modes = ["ReadWriteOnce"]
    persistent_volume_source {
      nfs {
        server = var.nfs_server
        path   = "${var.nfs_path}/restaurant-tracker"
      }
    }
  }
}

resource "kubernetes_persistent_volume_claim" "mongodb_pvc" {
  metadata {
    name      = "mongodb-pvc"
    namespace = kubernetes_namespace.restaurant.metadata[0].name
  }
  spec {
    access_modes       = ["ReadWriteOnce"]
    storage_class_name = "nfs-storage"
    resources {
      requests = {
        storage = "2Gi"
      }
    }
    volume_name = kubernetes_persistent_volume_v1.mongodb_pv.metadata[0].name
  }
}

resource "kubectl_manifest" "certificate" {
  yaml_body = yamlencode({
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "restaurant-tls"
      namespace = kubernetes_namespace.restaurant.metadata[0].name
    }
    spec = {
      commonName = "eats.${var.domain}"
      secretName = "restaurant-tls"
      issuerRef = {
        name  = "vault-issuer"
        kind  = "ClusterIssuer"
        group = "cert-manager.io"
      }
      dnsNames = [
        "eats.${var.domain}"
      ]
    }
  })
}

resource "kubernetes_ingress_v1" "restaurant_ingress" {
  metadata {
    name      = "restaurant-ingress"
    namespace = kubernetes_namespace.restaurant.metadata[0].name
    annotations = {
      "nginx.ingress.kubernetes.io/backend-protocol"   = "HTTP"
      "nginx.ingress.kubernetes.io/force-ssl-redirect" = "true"
      "nginx.ingress.kubernetes.io/proxy-body-size"    = "50m"
    }
  }
  spec {
    ingress_class_name = "nginx"
    tls {
      hosts       = ["eats.${var.domain}"]
      secret_name = "restaurant-tls"
    }
    rule {
      host = "eats.k8s.blacktoaster.com"
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.restaurant_app.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }

  depends_on = [kubectl_manifest.certificate]
}