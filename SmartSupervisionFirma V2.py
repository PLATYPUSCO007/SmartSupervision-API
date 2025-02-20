import hmac
import hashlib
import json

from urllib.parse import unquote

# @API_SECRET, clave secreta suministrada mediante correo electronico enviado a cada entidad
API_SECRET = 'wge^%f)4!a*u-x64jnya3zxogsm6#5k2s!tqhu2s@e^7t0vlo7'

api_key_bytes= bytes(API_SECRET, 'utf-8')

# *************************************************************************************
# @data, en esta variable va el cuerpo del mensaje enviado en la peticion,
# este valor se debe modificar dependiendo el servicio que se desea consumir.
# los servicios que requieren esta modificacion son de tipo PUT y POST
# *************************************************************
# VALORES DE DATA PARA GENERAR TOKEN
{
    "username": "rafaelenrique.cabrera@bbva.com",
    "password": "?^'NToSd%ql#gVv1X{e+"
}
# *************************************************************
# VALORES DE DATA PARA ENVIAR ARCHIVOS MTO 3
"""
"codigo_queja":"1426202410281345341860",
"type":"pdf"
"""
#**************************************************************
# VALORES DE DATA PARA ENVIAR CASO ACTUALIZADO
"""
"codigo_queja":"1426202410281345341860",
   "estado_cod":4,
   "documentacion_rta_final":"true",
   "anexo_queja":"true",
   "fecha_cierre":"2024-10-29T11:09:00",
   "fecha_actualizacion":"2024-10-29T11:09:00",
   "canal_cod":14,
   "producto_cod":127,
   "macro_motivo_cod":108,
   "marcacion":None,
   "aceptacion_queja":None,
   "desistimiento_queja":2,
   "queja_expres":2,
   "a_favor_de":3,
   "producto_digital":2,
   "rectificacion_queja":None,
   "prorroga_queja":None,
   "admision":9,
   "sexo":1,
   "lgbtiq":2,
   "condicion_especial":98,
   "tutela":2,
   "ente_control":99
   """
# *************************************************************************************
data = {
            "codigo_queja": "1426202410021902100737",
            "sexo": 1,
            "lgbtiq": 2,
            "condicion_especial": 98,
            "canal_cod": 5,
            "producto_cod": 124,
            "macro_motivo_cod": 916,
            "estado_cod": 2,
            "fecha_actualizacion": "2024-10-28T12:30:00",
            "producto_digital": 2,
            "a_favor_de": 1,
            "aceptacion_queja": None,
            "rectificacion_queja": None,
            "desistimiento_queja": 2,
            "prorroga_queja": None,
            "admision": 9,
            "documentacion_rta_final": "false",
            "anexo_queja": "false",
            "fecha_cierre": None,
            "tutela": 2,
            "ente_control": 99,
            "marcacion": 1,
            "queja_expres": 2
        }


data_str = json.dumps(data, ensure_ascii=False)
print('data_str: ', data_str)
# ***********************************************************************************
# se debe modificar la variable @path de acuerdo al servicio que se desea consumir,
# los servicios que requieren esta modificacion son de tipo GET o DELETE
# ***********************************************************************************
path = '' # inicialización requerida para consumir el servicio <<get Queja>>

signature = hmac.new(api_key_bytes,msg=data_str.encode('utf-8'),digestmod=hashlib.sha256).hexdigest().upper()
signature_path = hmac.new(api_key_bytes,msg=unquote(path).encode('utf-8'),digestmod=hashlib.sha256).hexdigest().upper()

# se utiliza para peticiones POST y PUT
print(f'Data - {signature}')

# se utiliza para peticiones GET y DELETE
print(f'URL - {signature_path}')