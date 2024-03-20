<?php
    if(!$con=mysqli_connect('localhost','root','','base_contatos')){
        echo "Erro ao acessar a base de dados";
    }
    mysqli_query($con,"SET NAMES utf8");
?>

