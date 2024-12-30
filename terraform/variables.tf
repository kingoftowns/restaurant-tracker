variable "nfs_server" {
  description = "value for nfs server"
  type        = string
  default     = "<nfs-server-ip>"
}

variable "nfs_path" {
  description = "value for nfs path"
  type        = string
  default     = "/<root-nfs-path>"
}

variable "domain" {
  description = "value for domain"
  type        = string
  default     = "<domain>"
}