# Expects json file in ./IDs.json
# All dumped memory needs to be in this folder and called: "SingleJapan.raw", "SinglePAL.raw", "SingleUSA.raw", "vsJapan.raw", "vsPAL.raw", "vsUSA.raw
# This script will read the memory dumps and update the json file with the new values and add more indexes to the json file if needed

import json
import struct
import math

def makeNewIndex(id):
    return {
        "ID": id,
        "Name": "Unknown_"+str(id),
        "Damage_Singleplayer_USA": [0, 0, 0],
        "Damage_Singleplayer_Splash_USA": [0, 0, 0],
        "Damage_VsMode_USA": [0, 0, 0],
        "Damage_VsMode_Splash_USA": [0, 0, 0],
        "Damage_Singleplayer_PAL": [0, 0, 0],
        "Damage_Singleplayer_Splash_PAL": [0, 0, 0],
        "Damage_VsMode_PAL": [0, 0, 0],
        "Damage_VsMode_Splash_PAL": [0, 0, 0],
        "Damage_Singleplayer_JAPAN": [0, 0, 0],
        "Damage_Singleplayer_Splash_JAPAN": [0, 0, 0],
        "Damage_VsMode_JAPAN": [0, 0, 0],
        "Damage_VsMode_Splash_JAPAN": [0, 0, 0],
        #"Extra_Offset": 0,
        "Notes": "",
        "Unused": 0
    }

def updateOldIndex(id, data):
    oldOne = data["WeaponIDs"][id]
    try:
        name = oldOne["Name"]
    except KeyError:
        name = "Unknown_"+str(id)

    try:
        dmg_sp_USA = oldOne["Damage_Singleplayer_USA"]
    except KeyError:
        dmg_sp_USA = [0, 0, 0]
    try:
        dmg_sp_splash_USA = oldOne["Damage_Singleplayer_Splash_USA"]
    except KeyError:
        dmg_sp_splash_USA = [0, 0, 0]
    try:
        dmg_vs_USA = oldOne["Damage_VsMode_USA"]
    except KeyError:
        dmg_vs_USA = [0, 0, 0]
    try:
        dmg_vs_splash_USA = oldOne["Damage_VsMode_Splash_USA"] 
    except KeyError:
        dmg_vs_splash_USA = [0, 0, 0]

    try:
        dmg_sp_PAL = oldOne["Damage_Singleplayer_PAL"]
    except KeyError:
        dmg_sp_PAL = [0, 0, 0]
    try:
        dmg_sp_splash_PAL = oldOne["Damage_Singleplayer_Splash_PAL"]
    except KeyError:
        dmg_sp_splash_PAL = [0, 0, 0]
    try:
        dmg_vs_PAL = oldOne["Damage_VsMode_PAL"]
    except KeyError:
        dmg_vs_PAL = [0, 0, 0]
    try:
        dmg_vs_splash_PAL = oldOne["Damage_VsMode_Splash_PAL"]
    except KeyError:
        dmg_vs_splash_PAL = [0, 0, 0]
    
    try:
        dmg_sp_JAPAN = oldOne["Damage_Singleplayer_JAPAN"]
    except KeyError:
        dmg_sp_JAPAN = [0, 0, 0]
    try:
        dmg_sp_splash_JAPAN = oldOne["Damage_Singleplayer_Splash_JAPAN"]
    except KeyError:
        dmg_sp_splash_JAPAN = [0, 0, 0]
    try:
        dmg_vs_JAPAN = oldOne["Damage_VsMode_JAPAN"]
    except KeyError:
        dmg_vs_JAPAN = [0, 0, 0]
    try:
        dmg_vs_splash_JAPAN = oldOne["Damage_VsMode_Splash_JAPAN"]
    except KeyError:
        dmg_vs_splash_JAPAN = [0, 0, 0]

    try:
        extra_off = oldOne["Extra_Offset"]
    except KeyError:
        extra_off = 0
    try:
        notes = oldOne["Notes"]
    except KeyError:
        notes = ""
    try:
        unused = oldOne["Unused"]
    except KeyError:
        unused = 0


    return {
        "ID": id,
        "Name": name,
        "Damage_Singleplayer_USA": dmg_sp_USA,
        "Damage_Singleplayer_Splash_USA": dmg_sp_splash_USA,
        "Damage_VsMode_USA": dmg_vs_USA,
        "Damage_VsMode_Splash_USA": dmg_vs_splash_USA,
        "Damage_Singleplayer_PAL": dmg_sp_PAL,
        "Damage_Singleplayer_Splash_PAL": dmg_sp_splash_PAL,
        "Damage_VsMode_PAL": dmg_vs_PAL,
        "Damage_VsMode_Splash_PAL": dmg_vs_splash_PAL,
        "Damage_Singleplayer_JAPAN": dmg_sp_JAPAN,
        "Damage_Singleplayer_Splash_JAPAN": dmg_sp_splash_JAPAN,
        "Damage_VsMode_JAPAN": dmg_vs_JAPAN,
        "Damage_VsMode_Splash_JAPAN": dmg_vs_splash_JAPAN,
        #"Extra_Offset": extra_off,
        "Notes": notes,
        "Unused": unused
    }

def updateIndex_HardCoded(index, data):
    oldOne = data["HardcodedDamage"][index]
    try:
        Type = oldOne["Type"]
    except KeyError:
        Type = "ERROR!!!!"
    try:
        Damage_USA = oldOne["Damage_USA"]
    except KeyError:
        Damage_USA = 0
    try:
        Damage_PAL = oldOne["Damage_PAL"]
    except KeyError:
        Damage_PAL = 0
    try:
        Damage_JAPAN = oldOne["Damage_JAPAN"]
    except KeyError:
        Damage_JAPAN = 0
    try:
        Address_USA = oldOne["Address_USA"]
    except KeyError:
        Address_USA = 0
    try:
        Address_PAL = oldOne["Address_PAL"]
    except KeyError:
        Address_PAL = 0
    try:
        Address_JAPAN = oldOne["Address_JAPAN"]
    except KeyError:
        Address_JAPAN = 0
    try:
        notes = oldOne["Notes"]
    except KeyError:
        notes = ""
    try:
        unused = oldOne["Unused"]
    except KeyError:
        unused = 0
    try:
        usaInstruction = oldOne["First16BitsOfInstruction_USA"]
    except KeyError:
        usaInstruction = 0
    try:
        palInstruction = oldOne["First16BitsOfInstruction_PAL"]
    except KeyError:
        palInstruction = 0
    try:
        japanInstruction = oldOne["First16BitsOfInstruction_JAPAN"]
    except KeyError:
        japanInstruction = 0
    try:
        specialGarbage = oldOne["First16BitsOfInstruction_JAPAN"]
    except KeyError:
        specialGarbage = {}
    
    return {
        "Type": Type,
        "Damage_USA": Damage_USA,
        "Damage_PAL": Damage_PAL,
        "Damage_JAPAN": Damage_JAPAN,
        "Address_USA": Address_USA,
        "Address_PAL": Address_PAL,
        "Address_JAPAN": Address_JAPAN,
        "First16BitsOfInstruction_USA": usaInstruction,
        "First16BitsOfInstruction_PAL": palInstruction,
        "First16BitsOfInstruction_JAPAN": japanInstruction,
        "Notes": notes,
        "Unused": unused,
        "SpecialHandling": specialGarbage
    }


with open('IDs.json', 'r') as file:
    data = json.load(file)

# Hardcoded values
gameVersion = ["_USA", "_PAL", "_JAPAN"]
filenames = ["SingleUSA.raw", "SinglePAL.raw", "SingleJapan.raw"]
for j in range(3):
    with open(filenames[j], 'rb') as file:
        for i in range(len(data["HardcodedDamage"])):
            data["HardcodedDamage"][i] = updateIndex_HardCoded(i, data)
            
            ReleventJSON = data["HardcodedDamage"][i]
            offset = ReleventJSON["Address"+gameVersion[j]] - 0x80000000 + 0x2
            file.seek(offset)
            temp = file.read(2)
            signed_int = struct.unpack('>h', temp)[0]
            ReleventJSON["Damage"+gameVersion[j]] = abs(signed_int)

            file.seek(offset-0x2)
            temp = file.read(2)
            stringHex = ''.join(f'{byte:02X}' for byte in temp)
            ReleventJSON["First16BitsOfInstruction"+gameVersion[j]] = stringHex

            data["HardcodedDamage"][i] = ReleventJSON

# Weapon Ids
gameVersion = ["_USA", "_USA", "_USA", "_USA", "_PAL", "_PAL", "_PAL", "_PAL", "_JAPAN", "_JAPAN", "_JAPAN", "_JAPAN"]
gameMode = ["_Singleplayer", "_Singleplayer", "_VsMode", "_VsMode", "_Singleplayer", "_Singleplayer", "_VsMode", "_VsMode", "_Singleplayer", "_Singleplayer", "_VsMode", "_VsMode"]
splash = ["", "_Splash", "", "_Splash", "", "_Splash", "", "_Splash", "", "_Splash", "", "_Splash"]
filenames = ["SingleUSA.raw", "SingleUSA.raw", "vsUSA.raw", "vsUSA.raw", "SinglePAL.raw", "SinglePAL.raw", "vsPAL.raw", "vsPAL.raw", "SingleJapan.raw", "SingleJapan.raw", "vsJapan.raw", "vsJapan.raw"]
for j in range(12):
    with open(filenames[j], 'rb') as file:
        base = data["BaseAddress"+gameVersion[j]]
        for i in range(168):
            if i < len(data["WeaponIDs"]):
                data["WeaponIDs"][i] = updateOldIndex(i, data)
            else:
                data["WeaponIDs"].append(makeNewIndex(i))
            
            ReleventJSON = data["WeaponIDs"][i]
            offset = base + (40*ReleventJSON["ID"]) + 14 - 0x80000000
            if (splash[j] == "_Splash"):
                offset += 6
            for k in range(3):
                file.seek(offset+(k*2))
                temp = file.read(2)
                signed_int = struct.unpack('>h', temp)[0]
                ReleventJSON["Damage"+gameMode[j]+splash[j]+gameVersion[j]][k] = signed_int
            data["WeaponIDs"][i] = ReleventJSON
        
with open('IDs.json', 'w') as file:
    json.dump(data, file,  indent=4, separators=(',', ':'))